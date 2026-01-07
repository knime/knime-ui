import { isDesktop } from '@/environment';
import * as amplitude from '@amplitude/analytics-browser';

export const track = ({
  event, 
  eventProperties = {}, 
  eventOptions = {}
}: {
  event: string; 
  eventProperties?: Record<string, unknown>; 
  eventOptions?: amplitude.Types.EventOptions
}) => {
  // or opted out of tracking
  if(isDesktop()) {
    return;
  }
  const baseEvent: amplitude.Types.BaseEvent = {
      event_type: event, 
      ...eventOptions, 
      event_properties: {
        ...eventProperties, 
        source: 'ap_browser'
      } 
    };
  const response = amplitude.track(baseEvent);
  consola.debug('Tracking event:', event, 'Response:', response);
};

