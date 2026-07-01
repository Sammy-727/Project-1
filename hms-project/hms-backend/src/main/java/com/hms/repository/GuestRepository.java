package com.hms.repository;

import com.hms.entity.Guest;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface GuestRepository extends JpaRepository<Guest, Long> {
    List<Guest> findByNameContainingIgnoreCaseOrPhoneContainingIgnoreCaseOrEmailContainingIgnoreCase(String a, String b, String c);
}
