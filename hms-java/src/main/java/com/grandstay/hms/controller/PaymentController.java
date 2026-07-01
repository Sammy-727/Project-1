package com.grandstay.hms.controller;

import com.grandstay.hms.model.Booking;
import com.grandstay.hms.model.BookingStatus;
import com.grandstay.hms.model.Payment;
import com.grandstay.hms.model.PaymentStatus;
import com.grandstay.hms.repository.BookingRepository;
import com.grandstay.hms.repository.PaymentRepository;
import com.grandstay.hms.service.HmsService;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Controller
@RequestMapping("/payments")
public class PaymentController {

    private final HmsService hmsService;
    private final PaymentRepository paymentRepository;
    private final BookingRepository bookingRepository;

    public PaymentController(HmsService hmsService, PaymentRepository paymentRepository,
                             BookingRepository bookingRepository) {
        this.hmsService = hmsService;
        this.paymentRepository = paymentRepository;
        this.bookingRepository = bookingRepository;
    }

    @GetMapping
    public String list(Model model) {
        model.addAttribute("title", "Payments");
        model.addAttribute("payments", paymentRepository.findAllByOrderByIdDesc());
        model.addAttribute("totalRevenue", paymentRepository.totalRevenue());
        List<Booking> pending = bookingRepository.findAll().stream()
                .filter(b -> (b.getPaymentStatus() == PaymentStatus.PENDING || b.getPaymentStatus() == PaymentStatus.PARTIAL)
                        && (b.getStatus() == BookingStatus.RESERVED || b.getStatus() == BookingStatus.CHECKED_IN))
                .toList();
        Map<Long, Double> balanceMap = new HashMap<>();
        for (Booking b : pending) {
            balanceMap.put(b.getId(), Math.max(hmsService.bookingTotal(b) - hmsService.paidAmount(b.getId()), 0));
        }
        model.addAttribute("pendingBookings", pending);
        model.addAttribute("balanceMap", balanceMap);
        return "payments";
    }

    @PostMapping("/add")
    public String add(@RequestParam Long bookingId, @RequestParam double amount,
                      @RequestParam String paymentMode, @RequestParam(required = false) String notes,
                      RedirectAttributes ra) {
        hmsService.addPayment(bookingId, amount, paymentMode, notes);
        ra.addFlashAttribute("success", "Payment recorded.");
        return "redirect:/payments";
    }

    @GetMapping("/receipt/{id}")
    public String receipt(@PathVariable Long id, Model model) {
        model.addAttribute("title", "Receipt");
        model.addAttribute("payment", paymentRepository.findById(id).orElseThrow());
        return "receipt";
    }
}
