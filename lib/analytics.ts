type CtaType = 'continue' | 'read1' | 'buy';

export const analytics = {
  view_home_section: (name: string) => {
    // wire to your analytics SDK
    console.debug('view_home_section', { name });
  },
  click_card: (payload: { id: string; section: string; pos: number }) => {
    console.debug('click_card', payload);
  },
  toggle_adult: (payload: { state: 'on' | 'off' }) => {
    console.debug('toggle_adult', payload);
  },
  click_cta: (payload: { type: CtaType }) => {
    console.debug('click_cta', payload);
  },
  open_free_today: () => console.debug('open_free_today'),
  claim_attendance: () => console.debug('claim_attendance'),
  open_ranking: (payload: { tab: 'realtime' | 'new' | 'complete' }) => {
    console.debug('open_ranking', payload);
  },
  open_tag: (payload: { tag: string }) => {
    console.debug('open_tag', payload);
  },
};


