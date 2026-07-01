package com.grandstay.hms.controller;

import com.grandstay.hms.model.Room;
import com.grandstay.hms.model.RoomStatus;
import com.grandstay.hms.repository.RoomRepository;
import com.grandstay.hms.service.HmsService;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Controller
@RequestMapping("/rooms")
public class RoomController {

    private final HmsService hmsService;
    private final RoomRepository roomRepository;

    public RoomController(HmsService hmsService, RoomRepository roomRepository) {
        this.hmsService = hmsService;
        this.roomRepository = roomRepository;
    }

    @GetMapping
    public String list(@RequestParam(required = false) String q,
                       @RequestParam(required = false) String status,
                       @RequestParam(required = false) String type, Model model) {
        model.addAttribute("title", "Rooms");
        model.addAttribute("rooms", hmsService.searchRooms(q, status, type));
        model.addAttribute("types", roomRepository.findDistinctRoomTypes());
        model.addAttribute("searchQ", q);
        model.addAttribute("filterStatus", status);
        model.addAttribute("filterType", type);
        model.addAttribute("roomStatuses", RoomStatus.values());
        return "rooms";
    }

    @PostMapping("/add")
    public String add(@ModelAttribute Room room, RedirectAttributes ra) {
        try {
            hmsService.saveRoom(room);
            ra.addFlashAttribute("success", "Room added successfully.");
        } catch (Exception e) {
            ra.addFlashAttribute("error", e.getMessage());
        }
        return "redirect:/rooms";
    }

    @PostMapping("/update/{id}")
    public String update(@PathVariable Long id, @ModelAttribute Room room, RedirectAttributes ra) {
        room.setId(id);
        hmsService.saveRoom(room);
        ra.addFlashAttribute("success", "Room updated.");
        return "redirect:/rooms";
    }

    @PostMapping("/delete/{id}")
    public String delete(@PathVariable Long id, RedirectAttributes ra) {
        try {
            hmsService.deleteRoom(id);
            ra.addFlashAttribute("success", "Room deleted.");
        } catch (Exception e) {
            ra.addFlashAttribute("error", e.getMessage());
        }
        return "redirect:/rooms";
    }
}
