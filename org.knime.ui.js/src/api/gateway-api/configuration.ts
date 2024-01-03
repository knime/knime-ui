export interface Configuration {
  url: string;
  postProcessCommandResponse?: <T>(response: Promise<T>) => Promise<T>;
}
