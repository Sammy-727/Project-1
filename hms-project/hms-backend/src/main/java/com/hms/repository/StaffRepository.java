package com.hms.repository;

import com.hms.entity.Staff;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StaffRepository extends JpaRepository<Staff, Long> {
    long countByStatus(String status);
}
