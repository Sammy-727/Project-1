package com.hms.dto;

public record DashboardStats(
    long totalRooms, long available, long occupied, long activeBookings,
    long staff, double revenue, long cleaning
) {}
