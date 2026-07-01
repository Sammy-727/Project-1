package com.hms.dto;

public record BookingRequest(Long guestId, Long roomId, String checkin, String checkout, int numGuests) {}
