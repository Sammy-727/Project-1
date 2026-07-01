package com.grandstay.hms.repository;

import com.grandstay.hms.model.Room;
import com.grandstay.hms.model.RoomStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface RoomRepository extends JpaRepository<Room, Long> {
    List<Room> findByStatus(RoomStatus status);
    List<Room> findByRoomNoContainingIgnoreCaseOrRoomTypeContainingIgnoreCase(String roomNo, String roomType);
    long countByStatus(RoomStatus status);

    @Query("SELECT r.roomType FROM Room r GROUP BY r.roomType ORDER BY r.roomType")
    List<String> findDistinctRoomTypes();
}
