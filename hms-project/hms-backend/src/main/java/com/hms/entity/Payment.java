package com.hms.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "payments")
public class Payment {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.EAGER) @JoinColumn(name = "booking_id") private Booking booking;
    private Double amount;
    private String paymentMode;
    @Column(unique = true) private String receiptNumber;
    private Instant paymentDate = Instant.now();
    private String notes;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Booking getBooking() { return booking; }
    public void setBooking(Booking booking) { this.booking = booking; }
    public Double getAmount() { return amount; }
    public void setAmount(Double amount) { this.amount = amount; }
    public String getPaymentMode() { return paymentMode; }
    public void setPaymentMode(String paymentMode) { this.paymentMode = paymentMode; }
    public String getReceiptNumber() { return receiptNumber; }
    public void setReceiptNumber(String receiptNumber) { this.receiptNumber = receiptNumber; }
    public Instant getPaymentDate() { return paymentDate; }
    public void setPaymentDate(Instant paymentDate) { this.paymentDate = paymentDate; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
