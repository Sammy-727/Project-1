package com.hms.repository;

import com.hms.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p") double totalRevenue();
    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.booking.id = :bookingId") double sumByBooking(Long bookingId);
    List<Payment> findAllByOrderByPaymentDateDesc();
}
