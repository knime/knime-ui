export interface Configuration {
  url: string;
  postProcessCommandResponse?: <T>(response: T) => Promise<T>;
}
