import { useCallback, useEffect, useId, useRef, useState } from 'preact/hooks';
import { Button } from './ui/button';
import { Description, Label } from './ui/fieldset';
import { Heading } from './ui/heading';
import { Switch, SwitchField, SwitchGroup } from './ui/switch';
import { Strong, Text, TextLink } from './ui/text';
import { cleanFile, type CleanOptions, type CleanReport } from './lib';
import { formatCoords } from './format';

interface Item {
  id: string;
  name: string;
  status: 'working' | 'done' | 'error';
  original: File;
  cleaned?: File;
  url?: string;
  report?: CleanReport;
  error?: string;
}
type DoneItem = Item & { cleaned: File; url: string; report: CleanReport };

const canShareFiles = (files: File[]): boolean =>
  typeof navigator !== 'undefined' && 'canShare' in navigator && navigator.canShare({ files });

async function share(files: File[]): Promise<void> {
  try {
    await navigator.share({ files });
  } catch {
    /* user cancelled */
  }
}

export function App() {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [dragging, setDragging] = useState(false);
  const [options, setOptions] = useState<Required<CleanOptions>>({
    keepOrientation: true,
    keepColorProfile: true
  });

  // Free object URLs when items disappear.
  const urlsRef = useRef(new Set<string>());
  useEffect(() => {
    const live = new Set(items.map((i) => i.url).filter((u): u is string => !!u));
    for (const u of urlsRef.current) if (!live.has(u)) URL.revokeObjectURL(u);
    urlsRef.current = live;
  }, [items]);

  const process = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files).filter((f) => f.size > 0);
      if (list.length === 0) return;
      const fresh: Item[] = list.map((file) => ({
        id: crypto.randomUUID(),
        name: file.name,
        status: 'working',
        original: file
      }));
      setItems((prev) => [...fresh, ...prev]);

      for (const item of fresh) {
        try {
          const { file, report } = await cleanFile(item.original, options);
          const url = URL.createObjectURL(file);
          setItems((prev) =>
            prev.map((i) => (i.id === item.id ? { ...i, status: 'done', cleaned: file, url, report } : i))
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Could not process this file';
          setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: 'error', error: message } : i)));
        }
      }
    },
    [options]
  );

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    if (event.dataTransfer?.files) void process(event.dataTransfer.files);
  };

  const onPick = (event: Event) => {
    const input = event.currentTarget as HTMLInputElement;
    if (input.files) void process(input.files);
    input.value = '';
  };

  const done = items.filter((i): i is DoneItem => i.status === 'done');

  const downloadAll = async () => {
    const { createZip } = await import('./lib/zip');
    const entries = await Promise.all(
      done.map(async (i) => ({ name: i.cleaned.name, data: new Uint8Array(await i.cleaned.arrayBuffer()) }))
    );
    const blob = new Blob([createZip(entries) as BlobPart], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cleaned-images.zip';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };

  return (
    <main className="mx-auto flex h-dvh w-full max-w-2xl flex-col gap-4 px-4 py-4 sm:py-8">
      <header className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
        <Heading>Meta Cleaner</Heading>
        <Text>Removes meta data from images.</Text>
      </header>

      <div
        role="button"
        tabIndex={0}
        aria-controls={inputId}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={[
          'flex shrink-0 cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-dashed px-4 py-6 text-center select-none transition-colors',
          'focus:outline-2 focus:outline-offset-2 focus:outline-blue-500',
          dragging
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10'
            : 'border-zinc-300 bg-white hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-500'
        ].join(' ')}
      >
        <PhotoIcon className="size-8 text-zinc-400" />
        <Strong>Drop images here, or tap to choose</Strong>
        <Text className="text-sm!">JPEG, PNG, WebP, GIF, HEIC, TIFF, SVG — cleaned without re-encoding.</Text>
        <input ref={inputRef} id={inputId} type="file" accept="image/*" multiple className="sr-only" onChange={onPick} />
      </div>

      <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
        {items.map((item) => (
          <ResultRow key={item.id} item={item} />
        ))}
      </ul>

      <footer className="flex shrink-0 flex-col gap-3">
        {items.length > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Text className="text-sm!">
              <Strong>{done.length}</Strong> of {items.length} ready
            </Text>
            <div className="flex gap-2">
              {done.length > 1 && (
                <Button outline onClick={downloadAll}>
                  <DownloadIcon />
                  All (.zip)
                </Button>
              )}
              {done.length > 1 && canShareFiles(done.map((i) => i.cleaned)) && (
                <Button outline onClick={() => share(done.map((i) => i.cleaned))}>
                  <ShareIcon />
                  Share all
                </Button>
              )}
              <Button plain onClick={() => setItems([])}>
                <XIcon />
                Clear
              </Button>
            </div>
          </div>
        )}

        <details className="group rounded-xl bg-white ring-1 ring-zinc-950/5 dark:bg-zinc-900 dark:ring-white/10">
          <summary className="cursor-pointer px-4 py-2 text-sm font-medium text-zinc-600 select-none dark:text-zinc-400">
            Settings
          </summary>
          <SwitchGroup className="px-4 pt-1 pb-4">
            <SwitchField>
              <Label>Keep orientation</Label>
              <Description>A single Orientation tag is kept so rotated phone photos stay upright.</Description>
              <Switch
                checked={options.keepOrientation}
                onChange={(v: boolean) => setOptions((o) => ({ ...o, keepOrientation: v }))}
              />
            </SwitchField>
            <SwitchField>
              <Label>Keep colour profile</Label>
              <Description>ICC profiles carry no personal data but keep colours accurate.</Description>
              <Switch
                checked={options.keepColorProfile}
                onChange={(v: boolean) => setOptions((o) => ({ ...o, keepColorProfile: v }))}
              />
            </SwitchField>
          </SwitchGroup>
        </details>

        <Text className="text-xs!">
          Everything happens on this device, nothing is uploaded.{' '}
          <TextLink href="https://github.com/slimcandy/MetaCleaner">Open source</TextLink>.
        </Text>
      </footer>
    </main>
  );
}

function ResultRow({ item }: { item: Item }) {
  const { report, cleaned, url } = item;
  const shareable = cleaned ? canShareFiles([cleaned]) : false;

  let summary = item.error ?? 'Working…';
  let details = '';
  if (report) {
    const exif = report.exif;
    const exifTags = exif?.tagCount ?? 0;
    const otherBlocks = report.removed.filter((r) => !r.name.startsWith('EXIF')).reduce((n, r) => n + (r.count ?? 1), 0);
    const kept = report.kept.includes('Orientation') ? 1 : 0;
    const removed = Math.max(0, exifTags + otherBlocks - kept);
    summary = report.removed.length === 0 ? 'Nothing to remove.' : `Removed ${removed} ${removed === 1 ? 'tag' : 'tags'}.`;
    if (report.method === 'reencode') summary += ' Re-encoded.';

    // Everything we know goes into the tooltip: what was inside, what was removed, what was kept.
    const lines: string[] = [];
    if (exif?.make || exif?.model) lines.push([exif.make, exif.model].filter(Boolean).join(' '));
    if (exif?.lens) lines.push(exif.lens);
    if (exif?.dateTimeOriginal) lines.push(exif.dateTimeOriginal);
    if (exif?.software) lines.push(exif.software);
    if (exif?.artist) lines.push(exif.artist);
    if (exif?.copyright) lines.push(exif.copyright);
    if (exif?.gps) lines.push(`GPS ${formatCoords(exif.gps.latitude, exif.gps.longitude)}`);
    if (exif?.hasThumbnail) lines.push('embedded thumbnail');
    for (const r of report.removed) {
      lines.push(r.name === 'EXIF' && exifTags ? `EXIF (${exifTags} tags)` : r.name + (r.count ? ` ×${r.count}` : ''));
    }
    for (const k of report.kept) lines.push(`kept ${k.toLowerCase()}`);
    details = lines.join('\n');
  }

  return (
    <li className="flex shrink-0 items-center gap-3 rounded-xl bg-white p-2 ring-1 ring-zinc-950/5 dark:bg-zinc-900 dark:ring-white/10">
      <button
        type="button"
        onClick={() => cleaned && shareable && share([cleaned])}
        disabled={!shareable}
        title={shareable ? 'Share' : undefined}
        className="group relative size-12 shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800"
      >
        {url && <img src={url} alt="" className="size-full object-cover" />}
        {shareable && (
          <span className="absolute inset-0 flex items-center justify-center bg-zinc-950/60 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            <ShareIcon className="size-5" />
          </span>
        )}
      </button>

      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
        <div className="flex min-w-0 flex-1 basis-40 flex-col">
          {cleaned && url ? (
            <a
              href={url}
              download={cleaned.name}
              title="Download"
              className="truncate font-semibold text-zinc-950 hover:underline dark:text-white"
            >
              {item.name}
            </a>
          ) : (
            <Strong className="truncate">{item.name}</Strong>
          )}
          <Text className={`truncate text-xs! ${item.status === 'error' ? 'text-red-600! dark:text-red-400!' : ''}`} title={details}>
            {summary}
          </Text>
        </div>

        {cleaned && url && (
          <div className="flex shrink-0 gap-2">
            <Button outline href={url} download={cleaned.name}>
              <DownloadIcon />
              Download
            </Button>
            {shareable && (
              <Button outline onClick={() => share([cleaned])}>
                <ShareIcon />
                Share
              </Button>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg data-slot="icon" viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden="true">
      <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
      <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
    </svg>
  );
}
function ShareIcon({ className }: { className?: string }) {
  return (
    <svg data-slot="icon" viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden="true">
      <path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M13.75 7h-3V3.66l1.95 2.1a.75.75 0 1 0 1.1-1.02l-3.25-3.5a.75.75 0 0 0-1.1 0L6.2 4.74a.75.75 0 0 0 1.1 1.02l1.95-2.1V7h-3A2.25 2.25 0 0 0 4 9.25v7.5A2.25 2.25 0 0 0 6.25 19h7.5A2.25 2.25 0 0 0 16 16.75v-7.5A2.25 2.25 0 0 0 13.75 7Zm-3 0h-1.5v5.25a.75.75 0 0 0 1.5 0V7Z"
      />
    </svg>
  );
}
function XIcon({ className }: { className?: string }) {
  return (
    <svg data-slot="icon" viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden="true">
      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
    </svg>
  );
}
function PhotoIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" className={className} aria-hidden="true">
      <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Zm10.5-11.25h.008v.008h-.008V9.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
    </svg>
  );
}
