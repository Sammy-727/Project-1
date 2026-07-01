package com.grandstay.hms.repository;

import com.grandstay.hms.model.HousekeepingTask;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface HousekeepingTaskRepository extends JpaRepository<HousekeepingTask, Long> {
    List<HousekeepingTask> findByStatusOrderByIdDesc(String status);
    List<HousekeepingTask> findAllByOrderByIdDesc();
}
