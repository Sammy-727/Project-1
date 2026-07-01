package com.grandstay.hms.controller;

import com.grandstay.hms.model.Booking;
import com.grandstay.hms.model.BookingStatus;
import com.grandstay.hms.repository.BookingRepository;
import com.grandstay.hms.service.HmsService;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Controller
@RequestMapping("/checkin-out")
public class CheckInOutController {

    private final HmsService hmsService;
    private final BookingRepository bookingRepository;

    public CheckInOutController(HmsService hmsService, BookingRepository bookingRepository) {
        this.hmsService = hmsService;
        this.bookingRepository = bookingRepository;
    }

    @GetMapping
    public String page(Model model) {
        model.addAttribute("title", "Check In / Out");
        model.addAttribute("today", LocalDate.now());
        model.addAttribute("arrivals", bookingRepository.findArrivals(BookingStatus.RESERVED, LocalDate.now()));
        List<Booking> active = bookingRepository.findByStatusOrderByIdDesc(BookingStatus.CHECKED_IN);
        Map<Long, Double> paidMap = new HashMap<>();
        Map<Long, Double> totalMap = new HashMap<>();
        Map<Long, Double> balanceMap = new HashMap<>();
        for (Booking b : active) {
            double paid = hmsService.paidAmount(b.getId());
            double total = hmsService.bookingTotal(b);
            paidMap.put(b.getId(), paid);
            totalMap.put(b.getId(), total);
            balanceMap.put(b.getId(), Math.max(total - paid, 0));
        }
        model.addAttribute("activeStays", active);
        model.addAttribute("paidMap", paidMap);
        model.addAttribute("totalMap", totalMap);
        model.addAttribute("balanceMap", balanceMap);
        return "checkin-out";
    }

    @PostMapping("/checkin/{id}")
    public String checkin(@PathVariable Long id, RedirectAttributes ra) {
        try {
            hmsService.checkIn(id);
            ra.addFlashAttribute("success", "Guest checked in.");
        } catch (Exception e) {
            ra.addFlashAttribute("error", e.getMessage());
        }
        return "redirect:/checkin-out";
    }

    @PostMapping("/checkout/{id}")
    public String checkout(@PathVariable Long id,
                           @RequestParam(defaultValue = "0") double discount,
                           @RequestParam(defaultValue = "0") double paymentAmount,
                           @RequestParam(defaultValue = "Cash") String paymentMode,
                           @RequestParam(required = false) boolean allowPending,
                           RedirectAttributes ra) {
        try {
            hmsService.checkOut(id, discount, paymentAmount, paymentMode, allowPending);
            ra.addFlashAttribute("success", "Checkout completed.");
            return "redirect:/invoice/" + id;
        } catch (Exception e) {
            ra.addFlashAttribute("error", e.getMessage());
            return "redirect:/checkin-out";
        }
    }
}
