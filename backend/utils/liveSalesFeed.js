import { EventEmitter } from 'events';

// Process-wide event bus for order events.
// Keeps implementation simple (no websockets) and works in single-node deployments.
export const liveSalesFeed = new EventEmitter();

export const publishOrderCreated = (payload) => {
  liveSalesFeed.emit('order.created', payload);
};

