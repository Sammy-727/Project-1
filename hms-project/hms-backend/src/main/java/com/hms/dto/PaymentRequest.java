package com.hms.dto;

public record PaymentRequest(Long bookingId, double amount, String paymentMode, String notes) {}
