package com.hms.entity;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "staff")
public class Staff {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false) private String name;
    private String phone;
    private String email;
    private String role;
    private String department;
    private Double salary;
    private LocalDate joiningDate;
    private String status = "Active";

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }
    public Double getSalary() { return salary; }
    public void setSalary(Double salary) { this.salary = salary; }
    public LocalDate getJoiningDate() { return joiningDate; }
    public void setJoiningDate(LocalDate joiningDate) { this.joiningDate = joiningDate; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
