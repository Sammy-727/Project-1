package com.grandstay.hms.repository;

import com.grandstay.hms.model.Guest;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface GuestRepository extends JpaRepository<Guest, Long> {
    List<Guest> findByCustomerIdAndBookingIsNull(Long customerId);
}
