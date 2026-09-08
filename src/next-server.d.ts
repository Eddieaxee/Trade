// Type declaration for next/server.js module resolution
declare module 'next/server.js' {
  export { NextRequest, NextResponse, NextFetchEvent, NextMiddleware } from 'next/server';
}

// Catch-all for Next.js internal module paths used by .next/types generated files
declare module 'next/dist/lib/metadata/types/metadata-interface.js' {
  export type Metadata = import('next').Metadata;
  export type ResolvingMetadata = import('next').ResolvingMetadata;
  export type Viewport = import('next').Viewport;
  export type ResolvingViewport = { viewport: Viewport | null; metadata: ResolvingMetadata };
}

declare module 'next/dist/lib/metadata/types/metadata-interface' {
  export type Metadata = import('next').Metadata;
  export type ResolvingMetadata = import('next').ResolvingMetadata;
  export type Viewport = import('next').Viewport;
  export type ResolvingViewport = { viewport: Viewport | null; metadata: ResolvingMetadata };
}