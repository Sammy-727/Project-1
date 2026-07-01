package com.hms.repository;

import com.hms.entity.Booking;
import com.hms.entity.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.time.LocalDate;
import java.util.List;

public interface BookingRepository extends JpaRepository<Booking, Long> {
    List<Booking> findTop10ByOrderByIdDesc();
    List<Booking> findAllByOrderByIdDesc();
    long countByStatusIn(List<BookingStatus> statuses);
    List<Booking> findByStatusOrderByCheckinAsc(BookingStatus status);
    @Query("SELECT b FROM Booking b WHERE b.status = :status AND b.checkin <= :today ORDER BY b.checkin")
    List<Booking> findArrivals(BookingStatus status, LocalDate today);
    @Query("SELECT COUNT(b) > 0 FROM Booking b WHERE b.room.id = :roomId AND b.status IN :statuses " +
           "AND b.checkin < :checkout AND b.checkout > :checkin AND (:excludeId IS NULL OR b.id <> :excludeId)")
    boolean hasOverlap(Long roomId, LocalDate checkin, LocalDate checkout, List<BookingStatus> statuses, Long excludeId);
}
