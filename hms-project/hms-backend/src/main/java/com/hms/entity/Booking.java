package com.hms.entity;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "bookings", indexes = {
    @Index(name = "idx_booking_room_dates", columnList = "room_id,checkin,checkout"),
    @Index(name = "idx_booking_status", columnList = "status")
})
public class Booking {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.EAGER) @JoinColumn(name = "guest_id") private Guest guest;
    @ManyToOne(fetch = FetchType.EAGER) @JoinColumn(name = "room_id") private Room room;
    private LocalDate checkin;
    private LocalDate checkout;
    private Integer numGuests = 1;
    private Double totalAmount = 0.0;
    @Enumerated(EnumType.STRING) private BookingStatus status = BookingStatus.RESERVED;
    @Enumerated(EnumType.STRING) private PaymentStatus paymentStatus = PaymentStatus.PENDING;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Guest getGuest() { return guest; }
    public void setGuest(Guest guest) { this.guest = guest; }
    public Room getRoom() { return room; }
    public void setRoom(Room room) { this.room = room; }
    public LocalDate getCheckin() { return checkin; }
    public void setCheckin(LocalDate checkin) { this.checkin = checkin; }
    public LocalDate getCheckout() { return checkout; }
    public void setCheckout(LocalDate checkout) { this.checkout = checkout; }
    public Integer getNumGuests() { return numGuests; }
    public void setNumGuests(Integer numGuests) { this.numGuests = numGuests; }
    public Double getTotalAmount() { return totalAmount; }
    public void setTotalAmount(Double totalAmount) { this.totalAmount = totalAmount; }
    public BookingStatus getStatus() { return status; }
    public void setStatus(BookingStatus status) { this.status = status; }
    public PaymentStatus getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(PaymentStatus paymentStatus) { this.paymentStatus = paymentStatus; }
}
