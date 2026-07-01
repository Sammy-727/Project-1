package com.grandstay.hms.repository;

import com.grandstay.hms.model.Booking;
import com.grandstay.hms.model.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.List;

public interface BookingRepository extends JpaRepository<Booking, Long> {

    long countByStatusIn(List<BookingStatus> statuses);

    List<Booking> findByStatusOrderByIdDesc(BookingStatus status);

    List<Booking> findByStatusInOrderByIdDesc(List<BookingStatus> statuses);

    @Query("SELECT b FROM Booking b WHERE b.status = :status AND b.checkin <= :today ORDER BY b.checkin")
    List<Booking> findArrivals(@Param("status") BookingStatus status, @Param("today") LocalDate today);

    @Query("SELECT b FROM Booking b WHERE b.status IN :statuses ORDER BY b.id DESC")
    List<Booking> findByStatuses(@Param("statuses") List<BookingStatus> statuses);

    @Query("SELECT COUNT(b) > 0 FROM Booking b WHERE b.room.id = :roomId AND b.status IN :statuses " +
           "AND b.checkin < :checkout AND b.checkout > :checkin AND (:excludeId IS NULL OR b.id <> :excludeId)")
    boolean hasOverlap(@Param("roomId") Long roomId, @Param("checkin") LocalDate checkin,
                       @Param("checkout") LocalDate checkout, @Param("statuses") List<BookingStatus> statuses,
                       @Param("excludeId") Long excludeId);

    long countByCustomerId(Long customerId);

    long countByRoomIdAndStatusIn(Long roomId, List<BookingStatus> statuses);

    List<Booking> findTop10ByOrderByIdDesc();

    List<Booking> findAllByOrderByIdDesc();
}
