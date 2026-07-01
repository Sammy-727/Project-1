package com.grandstay.hms.controller;

import com.grandstay.hms.model.Booking;
import com.grandstay.hms.model.InventoryItem;
import com.grandstay.hms.model.Payment;
import com.grandstay.hms.repository.*;
import com.grandstay.hms.service.HmsService;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;
import java.util.Map;

@Controller
public class DashboardController {

    private final HmsService hmsService;
    private final BookingRepository bookingRepository;
    private final PaymentRepository paymentRepository;
    private final InventoryRepository inventoryRepository;

    public DashboardController(HmsService hmsService, BookingRepository bookingRepository,
                               PaymentRepository paymentRepository, InventoryRepository inventoryRepository) {
        this.hmsService = hmsService;
        this.bookingRepository = bookingRepository;
        this.paymentRepository = paymentRepository;
        this.inventoryRepository = inventoryRepository;
    }

    @GetMapping("/dashboard")
    public String dashboard(Model model) {
        model.addAttribute("title", "Dashboard");
        model.addAttribute("stats", hmsService.dashboardStats());
        model.addAttribute("roomSummary", hmsService.roomStatusSummary());
        model.addAttribute("recentBookings", bookingRepository.findTop10ByOrderByIdDesc());
        model.addAttribute("recentPayments", paymentRepository.findTop8ByOrderByIdDesc());
        model.addAttribute("lowStock", inventoryRepository.findLowStock());
        model.addAttribute("totalRevenue", paymentRepository.totalRevenue());
        return "dashboard";
    }

    @GetMapping("/search")
    public String search(@RequestParam(required = false) String q, Model model) {
        model.addAttribute("title", "Search Results");
        model.addAttribute("q", q);
        if (q != null && !q.isBlank()) {
            model.addAttribute("rooms", hmsService.searchRooms(q, null, null).stream().limit(10).toList());
            model.addAttribute("customers", hmsService.searchCustomers(q).stream().limit(10).toList());
            model.addAttribute("bookings", bookingRepository.findAll().stream()
                    .filter(b -> b.getCustomer().getName().toLowerCase().contains(q.toLowerCase()) ||
                            b.getRoom().getRoomNo().contains(q)).limit(10).toList());
            model.addAttribute("payments", paymentRepository
                    .findByReceiptNumberContainingIgnoreCaseOrBooking_Customer_NameContainingIgnoreCase(q, q)
                    .stream().limit(10).toList());
        }
        return "search";
    }
}
