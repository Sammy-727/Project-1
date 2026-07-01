package com.grandstay.hms.controller;

import com.grandstay.hms.model.BookingStatus;
import com.grandstay.hms.model.RoomServiceRequest;
import com.grandstay.hms.repository.BookingRepository;
import com.grandstay.hms.repository.RoomServiceRequestRepository;
import com.grandstay.hms.service.HmsService;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.time.LocalDateTime;

@Controller
@RequestMapping("/room-service")
public class RoomServiceController {

    private final RoomServiceRequestRepository requestRepository;
    private final BookingRepository bookingRepository;
    private final HmsService hmsService;

    public RoomServiceController(RoomServiceRequestRepository requestRepository,
                                 BookingRepository bookingRepository, HmsService hmsService) {
        this.requestRepository = requestRepository;
        this.bookingRepository = bookingRepository;
        this.hmsService = hmsService;
    }

    @GetMapping
    public String list(@RequestParam(required = false) String status, Model model) {
        model.addAttribute("title", "Room Service");
        model.addAttribute("requests", status != null && !status.isBlank() ?
                requestRepository.findByStatusOrderByIdDesc(status) : requestRepository.findAllByOrderByIdDesc());
        model.addAttribute("activeBookings", bookingRepository.findByStatusOrderByIdDesc(BookingStatus.CHECKED_IN));
        return "room-service";
    }

    @PostMapping("/add")
    public String add(@RequestParam Long bookingId, @RequestParam String requestType,
                      @RequestParam(required = false) String description,
                      @RequestParam(defaultValue = "0") double charges,
                      @RequestParam(required = false) boolean addToBill, RedirectAttributes ra) {
        var booking = bookingRepository.findById(bookingId).orElseThrow();
        RoomServiceRequest rs = new RoomServiceRequest();
        rs.setBooking(booking);
        rs.setRoom(booking.getRoom());
        rs.setRequestType(requestType);
        rs.setDescription(description);
        rs.setCharges(charges);
        rs.setAddToBill(addToBill);
        rs.setStatus("Pending");
        rs.setCreatedAt(LocalDateTime.now());
        requestRepository.save(rs);
        if (addToBill) hmsService.updatePaymentStatus(booking);
        ra.addFlashAttribute("success", "Request added.");
        return "redirect:/room-service";
    }

    @PostMapping("/update/{id}")
    public String update(@PathVariable Long id, @RequestParam String status,
                         @RequestParam(defaultValue = "0") double charges,
                         @RequestParam(required = false) String description, RedirectAttributes ra) {
        RoomServiceRequest rs = requestRepository.findById(id).orElseThrow();
        rs.setStatus(status);
        rs.setCharges(charges);
        rs.setDescription(description);
        requestRepository.save(rs);
        if (rs.getBooking() != null) hmsService.updatePaymentStatus(rs.getBooking());
        ra.addFlashAttribute("success", "Request updated.");
        return "redirect:/room-service";
    }
}
