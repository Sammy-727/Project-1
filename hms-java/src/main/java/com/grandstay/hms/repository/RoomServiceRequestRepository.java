package com.grandstay.hms.repository;

import com.grandstay.hms.model.RoomServiceRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RoomServiceRequestRepository extends JpaRepository<RoomServiceRequest, Long> {
    List<RoomServiceRequest> findByStatusOrderByIdDesc(String status);
    List<RoomServiceRequest> findAllByOrderByIdDesc();

    List<RoomServiceRequest> findByBookingIdAndAddToBillTrueAndStatusNot(Long bookingId, String status);
}
