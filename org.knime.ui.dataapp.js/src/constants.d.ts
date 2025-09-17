interface _ComponentCustomProperties {
  $jobId: string;
  $restAPIUrl: string;
}

declare module "vue" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface ComponentCustomProperties extends _ComponentCustomProperties {}
}

export {};
