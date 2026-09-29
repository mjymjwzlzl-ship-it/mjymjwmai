// 이벤트 버스 시스템
class EventBus {
  private events: { [key: string]: Function[] } = {};

  on(event: string, callback: Function) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  off(event: string, callback: Function) {
    if (!this.events[event]) return;
    
    this.events[event] = this.events[event].filter(cb => cb !== callback);
  }

  emit(event: string, data?: any) {
    if (!this.events[event]) return;
    
    this.events[event].forEach(callback => {
      callback(data);
    });
  }
}

export const eventBus = new EventBus();

// 이벤트 타입
export const EVENTS = {
  COIN_BALANCE_UPDATED: 'coin_balance_updated',
  EPISODE_PURCHASED: 'episode_purchased',
  USER_LOGGED_IN: 'user_logged_in',
  USER_LOGGED_OUT: 'user_logged_out',
};