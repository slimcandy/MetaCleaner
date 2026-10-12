import { useCallback, useEffect, useState } from 'preact/hooks';
import { Button } from './ui/button';
import { Description, Label } from './ui/fieldset';
import { Heading } from './ui/heading';
import { Switch, SwitchField, SwitchGroup } from './ui/switch';
import { Text, TextLink } from './ui/text';
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

// Everything lib/ can clean. Listing HEIC explicitly also stops iOS from transcoding it to JPEG on pick.
const ACCEPT = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif', 'image/avif', 'image/tiff', 'image/svg+xml',
  '.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic', '.heif', '.avif', '.tif', '.tiff', '.svg'
].join(',');

const canShareFiles = (files: File[]): boolean => navigator.canShare?.({ files }) ?? false;

async function share(files: File[]): Promise<void> {
  try {
    await navigator.share({ files });
  } catch {
    /* user cancelled */
  }
}

// At the largest accessibility text sizes the switch moves under its description.
const stackedField =
  '@max-[14rem]:grid-cols-1 @max-[14rem]:*:data-[slot=control]:col-start-1 @max-[14rem]:*:data-[slot=control]:row-start-3';

export function App() {
  const [items, setItems] = useState<Item[]>([]);
  const [options, setOptions] = useState<Required<CleanOptions>>({
    keepOrientation: true,
    keepColorProfile: true
  });

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

  // The whole page accepts dropped files.
  useEffect(() => {
    const onOver = (e: DragEvent) => e.preventDefault();
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) void process(e.dataTransfer.files);
    };
    window.addEventListener('dragover', onOver);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragover', onOver);
      window.removeEventListener('drop', onDrop);
    };
  }, [process]);

  const onPick = (event: Event) => {
    const input = event.currentTarget as HTMLInputElement;
    if (input.files) void process(input.files);
    input.value = '';
  };

  const clear = () => {
    for (const i of items) if (i.url) URL.revokeObjectURL(i.url);
    setItems([]);
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
    <main className="@container mx-auto hyphens-auto flex min-h-full w-full max-w-2xl flex-col gap-4 px-4 py-4 sm:py-8">
      <header className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
        <Heading>Meta Cleaner</Heading>
        <Text>Removes meta data from images.</Text>
      </header>

      <div className="flex flex-col gap-1.5">
        <input
          type="file"
          accept={ACCEPT}
          multiple
          onChange={onPick}
          className={`block w-full overflow-hidden text-sm text-zinc-600 file:mr-3 file:cursor-pointer file:rounded-lg file:border file:px-3 file:py-1.5 file:text-sm file:font-semibold dark:text-zinc-400 ${
            items.length > 0
              ? 'file:border-zinc-950/10 file:bg-white file:text-zinc-950 dark:file:border-white/15 dark:file:bg-zinc-800 dark:file:text-white'
              : 'file:border-transparent file:bg-zinc-900 file:text-white dark:file:bg-zinc-600'
          }`}
        />
        <Text className="flex items-center gap-1 text-xs!">
          <CursorIcon className="size-4" />
          or drop images here
        </Text>
      </div>

      {items.length > 0 && (
        // Container queries in rem follow Dynamic Type. As text grows, the card adapts instead of
        // overflowing: buttons stack full-width and the name gets two lines, then the thumbnail moves on top.
        <ul className="@container flex flex-col gap-2">
          {items.map((item) => (
            <ResultRow key={item.id} item={item} />
          ))}
        </ul>
      )}

      {items.length > 0 && (
        <div className="-mt-2 flex justify-end">
          <Button size="sm" outline onClick={clear}>
            <TrashIcon />
            Clear images
          </Button>
        </div>
      )}

      {done.length > 1 && (
        // On accessibility text sizes the buttons stack, and the bar stops being sticky so it doesn't cover the list.
        // At the very largest sizes icons are dropped so the labels still fit.
        <div className="sticky bottom-0 -mx-4 flex gap-2 bg-zinc-100/50 @max-[14rem]:static @max-[14rem]:flex-col @max-[8rem]:[&_[data-slot=icon]]:hidden px-4 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] dark:bg-zinc-950/50">
          {canShareFiles(done.map((i) => i.cleaned)) && (
            <Button size="sm" className="flex-1" onClick={() => share(done.map((i) => i.cleaned))}>
              <ShareStackIcon />
              Share all
            </Button>
          )}
          <Button size="sm" color="light" className="flex-1" onClick={downloadAll}>
            <DownloadStackIcon />
            Save all
          </Button>
        </div>
      )}

      <footer className="mt-auto flex flex-col gap-3 pt-4">
        <details>
          <summary className="relative w-fit cursor-pointer rounded-md border border-zinc-950/10 px-2 text-xs/6 text-zinc-600 select-none after:absolute after:inset-x-0 after:-inset-y-2.5 hover:bg-zinc-950/2.5 dark:border-white/15 dark:text-zinc-400 dark:hover:bg-white/5">
            Settings
          </summary>
          <SwitchGroup className="pt-3 pb-2">
            <SwitchField className={stackedField}>
              <Label>Keep orientation</Label>
              <Description>A single Orientation tag is kept so rotated phone photos stay upright.</Description>
              <Switch
                checked={options.keepOrientation}
                onChange={(v: boolean) => setOptions((o) => ({ ...o, keepOrientation: v }))}
              />
            </SwitchField>
            <SwitchField className={stackedField}>
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
          Processed on your device. <TextLink href="https://github.com/slimcandy/MetaCleaner">Open source</TextLink>.
        </Text>
      </footer>

    </main>
  );
}

function ResultRow({ item }: { item: Item }) {
  const { report, cleaned, url } = item;
  const shareable = cleaned ? canShareFiles([cleaned]) : false;

  // What was found and removed goes into the tooltip on the file name.
  let details: string | undefined;
  if (report) {
    const exif = report.exif;
    const exifTags = exif?.tagCount ?? 0;
    const otherBlocks = report.removed.filter((r) => !r.name.startsWith('EXIF')).reduce((n, r) => n + (r.count ?? 1), 0);
    const kept = report.kept.includes('Orientation') ? 1 : 0;
    const removed = Math.max(0, exifTags + otherBlocks - kept);

    const found: string[] = [];
    if (exif?.make || exif?.model) found.push([exif.make, exif.model].filter(Boolean).join(' '));
    if (exif?.lens) found.push(exif.lens);
    if (exif?.dateTimeOriginal) found.push(exif.dateTimeOriginal);
    if (exif?.software) found.push(exif.software);
    if (exif?.artist) found.push(exif.artist);
    if (exif?.copyright) found.push(exif.copyright);
    if (exif?.gps) found.push(`GPS ${formatCoords(exif.gps.latitude, exif.gps.longitude)}`);
    if (exif?.hasThumbnail) found.push('embedded thumbnail');
    for (const r of report.removed) {
      found.push(r.name === 'EXIF' && exifTags ? `EXIF (${exifTags} tags)` : r.name + (r.count ? ` ×${r.count}` : ''));
    }

    const lines =
      report.removed.length === 0
        ? ['Nothing to remove.']
        : [`Removed ${removed} ${removed === 1 ? 'tag' : 'tags'}:`, ...found.map((f) => `- ${f}`)];
    for (const k of report.kept) lines.push(`Kept ${k.toLowerCase()}.`);
    if (report.method === 'reencode') lines.push('Re-encoded.');
    details = lines.join('\n');
  }

  return (
    <li className="flex items-center gap-3 rounded-xl bg-white p-2 ring-1 ring-zinc-950/5 @max-[14rem]:flex-col @max-[14rem]:items-stretch @max-[8rem]:[&_[data-slot=icon]]:hidden dark:bg-zinc-900 dark:ring-white/10">
      <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
        {url && <img src={url} alt="" className="size-full object-cover" />}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="truncate text-sm/5 font-semibold text-zinc-950 @max-[18rem]:line-clamp-2 @max-[18rem]:break-all @max-[18rem]:whitespace-normal dark:text-white" title={details}>
          {item.name}
        </p>

        {cleaned && url ? (
          <div className="flex gap-2 @max-[18rem]:flex-col">
            {shareable && (
              <Button size="sm" outline aria-label={`Share ${item.name}`} onClick={() => share([cleaned])}>
                <ShareIcon />
                Share
              </Button>
            )}
            <Button size="sm" outline aria-label={`Download ${item.name}`} href={url} download={cleaned.name}>
              <DownloadIcon />
              Download
            </Button>
          </div>
        ) : (
          <p role="status" className={`truncate text-sm/5 ${item.error ? 'text-red-600 dark:text-red-400' : 'text-zinc-500 dark:text-zinc-400'}`}>
            {item.error ?? 'Working…'}
          </p>
        )}
      </div>
    </li>
  );
}

// Heroicons 24/outline.
function ShareIcon({ className }: { className?: string }) {
  return (
    <svg data-slot="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" className={className} aria-hidden="true">
      <path stroke-linecap="round" stroke-linejoin="round" d="M9 8.25H7.5a2.25 2.25 0 0 0-2.25 2.25v9a2.25 2.25 0 0 0 2.25 2.25h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25H15m0-3-3-3m0 0-3 3m3-3V15" />
    </svg>
  );
}
function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg data-slot="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" className={className} aria-hidden="true">
      <path stroke-linecap="round" stroke-linejoin="round" d="M9 8.25H7.5a2.25 2.25 0 0 0-2.25 2.25v9a2.25 2.25 0 0 0 2.25 2.25h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25H15M9 12l3 3m0 0 3-3m-3 3V2.25" />
    </svg>
  );
}
function ShareStackIcon({ className }: { className?: string }) {
  return (
    <svg data-slot="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" className={className} aria-hidden="true">
      <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 7.5h-.75A2.25 2.25 0 0 0 4.5 9.75v7.5a2.25 2.25 0 0 0 2.25 2.25h7.5a2.25 2.25 0 0 0 2.25-2.25v-7.5a2.25 2.25 0 0 0-2.25-2.25h-.75m0-3-3-3m0 0-3 3m3-3v11.25m6-2.25h.75a2.25 2.25 0 0 1 2.25 2.25v7.5a2.25 2.25 0 0 1-2.25 2.25h-7.5a2.25 2.25 0 0 1-2.25-2.25v-.75" />
    </svg>
  );
}
function DownloadStackIcon({ className }: { className?: string }) {
  return (
    <svg data-slot="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" className={className} aria-hidden="true">
      <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 7.5h-.75A2.25 2.25 0 0 0 4.5 9.75v7.5a2.25 2.25 0 0 0 2.25 2.25h7.5a2.25 2.25 0 0 0 2.25-2.25v-7.5a2.25 2.25 0 0 0-2.25-2.25h-.75m-6 3.75 3 3m0 0 3-3m-3 3V1.5m6 9h.75a2.25 2.25 0 0 1 2.25 2.25v7.5a2.25 2.25 0 0 1-2.25 2.25h-7.5a2.25 2.25 0 0 1-2.25-2.25v-.75" />
    </svg>
  );
}
function CursorIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" className={className} aria-hidden="true">
      <path stroke-linecap="round" stroke-linejoin="round" d="M15.042 21.672 13.684 16.6m0 0-2.51 2.225.569-9.47 5.227 7.917-3.286-.672ZM12 2.25V4.5m5.834.166-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243-1.59-1.59" />
    </svg>
  );
}
function TrashIcon({ className }: { className?: string }) {
  return (
    <svg data-slot="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" className={className} aria-hidden="true">
      <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  );
}
