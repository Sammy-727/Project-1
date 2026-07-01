package com.hms.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "guest_members")
public class GuestMember {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "guest_id")
    private Guest primaryGuest;
    private String name;
    private Integer age;
    private String gender;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Guest getPrimaryGuest() { return primaryGuest; }
    public void setPrimaryGuest(Guest primaryGuest) { this.primaryGuest = primaryGuest; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public Integer getAge() { return age; }
    public void setAge(Integer age) { this.age = age; }
    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }
}
