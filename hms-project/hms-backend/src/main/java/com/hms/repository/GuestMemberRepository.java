package com.hms.repository;

import com.hms.entity.GuestMember;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GuestMemberRepository extends JpaRepository<GuestMember, Long> {}
