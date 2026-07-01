package com.grandstay.hms.controller;

import com.grandstay.hms.model.HousekeepingTask;
import com.grandstay.hms.model.RoomStatus;
import com.grandstay.hms.repository.EmployeeRepository;
import com.grandstay.hms.repository.HousekeepingTaskRepository;
import com.grandstay.hms.repository.RoomRepository;
import com.grandstay.hms.service.HmsService;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.time.LocalDateTime;

@Controller
@RequestMapping("/housekeeping")
public class HousekeepingController {

    private final HousekeepingTaskRepository taskRepository;
    private final RoomRepository roomRepository;
    private final EmployeeRepository employeeRepository;
    private final HmsService hmsService;

    public HousekeepingController(HousekeepingTaskRepository taskRepository, RoomRepository roomRepository,
                                  EmployeeRepository employeeRepository, HmsService hmsService) {
        this.taskRepository = taskRepository;
        this.roomRepository = roomRepository;
        this.employeeRepository = employeeRepository;
        this.hmsService = hmsService;
    }

    @GetMapping
    public String list(@RequestParam(required = false) String status, Model model) {
        model.addAttribute("title", "Housekeeping");
        model.addAttribute("tasks", status != null && !status.isBlank() ?
                taskRepository.findByStatusOrderByIdDesc(status) : taskRepository.findAllByOrderByIdDesc());
        model.addAttribute("hkStaff", employeeRepository.findByDepartmentAndStatus("Housekeeping", "Active"));
        model.addAttribute("cleaningRooms", roomRepository.findByStatus(RoomStatus.CLEANING));
        return "housekeeping";
    }

    @PostMapping("/add")
    public String add(@RequestParam Long roomId, @RequestParam(required = false) Long assignedTo,
                      @RequestParam(defaultValue = "Medium") String priority,
                      @RequestParam(required = false) String notes, RedirectAttributes ra) {
        HousekeepingTask task = new HousekeepingTask();
        task.setRoom(roomRepository.findById(roomId).orElseThrow());
        if (assignedTo != null) task.setAssignedTo(employeeRepository.findById(assignedTo).orElse(null));
        task.setStatus("Pending");
        task.setPriority(priority);
        task.setNotes(notes);
        task.setCreatedAt(LocalDateTime.now());
        taskRepository.save(task);
        ra.addFlashAttribute("success", "Task created.");
        return "redirect:/housekeeping";
    }

    @PostMapping("/update/{id}")
    public String update(@PathVariable Long id, @RequestParam(required = false) Long assignedTo,
                         @RequestParam String status, @RequestParam String priority,
                         @RequestParam(required = false) String notes, RedirectAttributes ra) {
        HousekeepingTask task = taskRepository.findById(id).orElseThrow();
        if (assignedTo != null) task.setAssignedTo(employeeRepository.findById(assignedTo).orElse(null));
        task.setStatus(status);
        task.setPriority(priority);
        task.setNotes(notes);
        if ("Completed".equals(status)) {
            task.setCompletedAt(LocalDateTime.now());
        }
        taskRepository.save(task);
        if ("Completed".equals(status)) {
            var room = task.getRoom();
            room.setStatus(RoomStatus.AVAILABLE);
            roomRepository.save(room);
        }
        ra.addFlashAttribute("success", "Task updated.");
        return "redirect:/housekeeping";
    }
}
