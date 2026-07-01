package com.grandstay.hms.repository;

import com.grandstay.hms.model.Employee;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface EmployeeRepository extends JpaRepository<Employee, Long> {
    long countByStatus(String status);
    List<Employee> findByDepartmentAndStatus(String department, String status);
    List<Employee> findByNameContainingIgnoreCaseOrEmailContainingIgnoreCaseOrDepartmentContainingIgnoreCase(
            String name, String email, String department);
}
