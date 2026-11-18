/**
 * Saigon Indoor Golf (SIGOLF) — Module Bãi Đậu Xe
 * Spot Availability & Conflict Checking Engine
 * 
 * Rules:
 * - Half-open interval [expectedIn, expectedOut) + bufferMinutes.
 * - Holds expire strictly at holdExpiresAt (server timestamp).
 * - A spot is unavailable if there is an active/confirmed booking or a non-expired hold overlapping.
 * - An active vehicle currently in the lot blocks new reservations starting before estimated clearance.
 */

import type { ParkingSpot, ParkingTicket } from './types';

export function isTimeWindowOverlapping(
  startA: number,
  endA: number,
  startB: number,
  endB: number,
  bufferMinutes: number = 0,
): boolean {
  const bufferMs = bufferMinutes * 60 * 1000;
  // Overlap condition: max(startA, startB - buffer) < min(endA, endB + buffer)
  const windowAStart = startA;
  const windowAEnd = endA;
  const windowBStart = startB - bufferMs;
  const windowBEnd = endB + bufferMs;

  return Math.max(windowAStart, windowBStart) < Math.min(windowAEnd, windowBEnd);
}

export function isTicketHoldExpired(ticket: ParkingTicket, now: number = Date.now()): boolean {
  if (ticket.status !== 'holding') return false;
  return ticket.holdExpiresAt <= now;
}

/**
 * Determines whether a ticket is currently actively occupying or reserving a spot for a requested window.
 */
export function doesTicketConflict(
  ticket: ParkingTicket,
  targetIn: number,
  targetOut: number,
  bufferMinutes: number = 0,
  now: number = Date.now(),
): boolean {
  // If cancelled or refunded, no conflict
  if (ticket.status === 'cancelled') return false;

  // If holding but expired, hold has expired!
  if (ticket.status === 'holding' && ticket.holdExpiresAt <= now) {
    return false;
  }

  // If vehicle has already completed and checked out
  if (ticket.status === 'completed') {
    // If it checked out before targetIn, it's clear
    if (ticket.actualOut && ticket.actualOut <= targetIn) {
      return false;
    }
  }

  // If vehicle is physically parked right now ('active')
  if (ticket.status === 'active' && ticket.actualIn && !ticket.actualOut) {
    // Vehicle is physically occupying the spot right now
    // If the target window is in the past or starts before the vehicle leaves
    const effectiveOut = Math.max(ticket.expectedOut, now + 30 * 60 * 1000);
    return isTimeWindowOverlapping(ticket.actualIn, effectiveOut, targetIn, targetOut, bufferMinutes);
  }

  // Normal confirmed or active holding ticket
  return isTimeWindowOverlapping(ticket.expectedIn, ticket.expectedOut, targetIn, targetOut, bufferMinutes);
}

/**
 * Classifies the spot status for display:
 * - 'maintenance': spot is locked for maintenance
 * - 'occupied': vehicle is physically inside the spot right now
 * - 'held': temporary 5-min hold active
 * - 'booked': confirmed reservation
 * - 'available': free to book
 */
export function evaluateSpotState(
  spot: ParkingSpot,
  tickets: ParkingTicket[],
  targetIn: number,
  targetOut: number,
  bufferMinutes: number = 0,
  now: number = Date.now(),
): {
  state: 'available' | 'held' | 'booked' | 'occupied' | 'maintenance';
  activeTicket?: ParkingTicket;
} {
  if (spot.status === 'maintenance' || !spot.isActive) {
    return { state: 'maintenance' };
  }

  // Check physical occupancy first
  const activeNow = tickets.find(
    (t) => t.spotId === spot.id && t.status === 'active' && t.actualIn && !t.actualOut,
  );
  if (activeNow) {
    return { state: 'occupied', activeTicket: activeNow };
  }

  // Check conflicts in the requested window
  for (const t of tickets) {
    if (t.spotId !== spot.id) continue;
    if (doesTicketConflict(t, targetIn, targetOut, bufferMinutes, now)) {
      if (t.status === 'holding') {
        return { state: 'held', activeTicket: t };
      }
      return { state: 'booked', activeTicket: t };
    }
  }

  return { state: 'available' };
}
