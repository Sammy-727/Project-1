package com.grandstay.hms.repository;

import com.grandstay.hms.model.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    List<Payment> findByBookingIdOrderByIdAsc(Long bookingId);

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.booking.id = :bookingId")
    double sumByBookingId(Long bookingId);

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p")
    double totalRevenue();

    List<Payment> findTop8ByOrderByIdDesc();

    List<Payment> findAllByOrderByIdDesc();

    List<Payment> findByReceiptNumberContainingIgnoreCaseOrBooking_Customer_NameContainingIgnoreCase(
            String receipt, String name);
}
