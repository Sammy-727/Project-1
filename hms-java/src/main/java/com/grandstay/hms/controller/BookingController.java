package com.grandstay.hms.controller;

import com.grandstay.hms.model.BookingStatus;
import com.grandstay.hms.repository.BookingRepository;
import com.grandstay.hms.repository.CustomerRepository;
import com.grandstay.hms.repository.RoomRepository;
import com.grandstay.hms.service.HmsService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.time.LocalDate;
import java.util.List;

@Controller
@RequestMapping("/bookings")
public class BookingController {

    private final HmsService hmsService;
    private final BookingRepository bookingRepository;
    private final CustomerRepository customerRepository;
    private final RoomRepository roomRepository;

    public BookingController(HmsService hmsService, BookingRepository bookingRepository,
                             CustomerRepository customerRepository, RoomRepository roomRepository) {
        this.hmsService = hmsService;
        this.bookingRepository = bookingRepository;
        this.customerRepository = customerRepository;
        this.roomRepository = roomRepository;
    }

    @GetMapping
    public String list(@RequestParam(required = false) String q,
                       @RequestParam(required = false) String status,
                       @RequestParam(required = false) Long newCustomer, Model model) {
        model.addAttribute("title", "Bookings");
        model.addAttribute("bookings", bookingRepository.findAllByOrderByIdDesc());
        model.addAttribute("customers", customerRepository.findAll());
        model.addAttribute("rooms", roomRepository.findAll());
        model.addAttribute("bookingStatuses", BookingStatus.values());
        model.addAttribute("newCustomer", newCustomer);
        return "bookings";
    }

    @PostMapping("/add")
    public String add(@RequestParam Long customerId, @RequestParam Long roomId,
                      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkin,
                      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkout,
                      @RequestParam(defaultValue = "1") int numGuests,
                      @RequestParam(required = false) List<String> guestName,
                      RedirectAttributes ra) {
        try {
            hmsService.createBooking(customerId, roomId, checkin, checkout, numGuests, guestName);
            ra.addFlashAttribute("success", "Booking created.");
        } catch (Exception e) {
            ra.addFlashAttribute("error", e.getMessage());
        }
        return "redirect:/bookings";
    }

    @PostMapping("/cancel/{id}")
    public String cancel(@PathVariable Long id, RedirectAttributes ra) {
        hmsService.cancelBooking(id);
        ra.addFlashAttribute("success", "Booking cancelled.");
        return "redirect:/bookings";
    }
}
