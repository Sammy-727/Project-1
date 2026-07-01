package com.hms.entity;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "guests")
public class Guest {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false) private String name;
    private String phone;
    private String email;
    private String address;
    private String idProofType;
    private String idProofNumber;
    private String gender;
    private Integer age;

    @OneToMany(mappedBy = "primaryGuest", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<GuestMember> members = new ArrayList<>();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    public String getIdProofType() { return idProofType; }
    public void setIdProofType(String idProofType) { this.idProofType = idProofType; }
    public String getIdProofNumber() { return idProofNumber; }
    public void setIdProofNumber(String idProofNumber) { this.idProofNumber = idProofNumber; }
    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }
    public Integer getAge() { return age; }
    public void setAge(Integer age) { this.age = age; }
    public List<GuestMember> getMembers() { return members; }
    public void setMembers(List<GuestMember> members) { this.members = members; }
}
