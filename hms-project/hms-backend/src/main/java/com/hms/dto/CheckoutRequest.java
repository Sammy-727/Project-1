package com.hms.dto;

public record CheckoutRequest(double discount, double paymentAmount, String paymentMode, boolean allowPending) {}
