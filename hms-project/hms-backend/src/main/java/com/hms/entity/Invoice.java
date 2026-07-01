package com.hms.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "invoices")
public class Invoice {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @OneToOne @JoinColumn(name = "booking_id", unique = true) private Booking booking;
    private Double roomCharges;
    private Double serviceCharges;
    private Double tax;
    private Double discount;
    private Double total;
    @Enumerated(EnumType.STRING) private PaymentStatus paymentStatus;
    private Instant billDate = Instant.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Booking getBooking() { return booking; }
    public void setBooking(Booking booking) { this.booking = booking; }
    public Double getRoomCharges() { return roomCharges; }
    public void setRoomCharges(Double roomCharges) { this.roomCharges = roomCharges; }
    public Double getServiceCharges() { return serviceCharges; }
    public void setServiceCharges(Double serviceCharges) { this.serviceCharges = serviceCharges; }
    public Double getTax() { return tax; }
    public void setTax(Double tax) { this.tax = tax; }
    public Double getDiscount() { return discount; }
    public void setDiscount(Double discount) { this.discount = discount; }
    public Double getTotal() { return total; }
    public void setTotal(Double total) { this.total = total; }
    public PaymentStatus getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(PaymentStatus paymentStatus) { this.paymentStatus = paymentStatus; }
    public Instant getBillDate() { return billDate; }
}
