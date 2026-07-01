package com.hms.repository;

import com.hms.entity.Room;
import com.hms.entity.RoomStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface RoomRepository extends JpaRepository<Room, Long> {
    long countByStatus(RoomStatus status);
    List<Room> findByRoomNoContainingIgnoreCaseOrRoomTypeContainingIgnoreCase(String a, String b);
    @Query("SELECT DISTINCT r.roomType FROM Room r ORDER BY r.roomType") List<String> findDistinctTypes();
}
