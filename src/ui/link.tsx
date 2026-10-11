import * as Headless from '@headlessui/react';
import type { AnchorHTMLAttributes, Ref } from 'preact';
import { forwardRef } from 'preact/compat';

export type LinkProps = { href: string } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'ref' | 'role'>;

export const Link = forwardRef(function Link(props: LinkProps, ref: Ref<HTMLAnchorElement>) {
  return (
    <Headless.DataInteractive>
      <a {...props} ref={ref} />
    </Headless.DataInteractive>
  );
});
