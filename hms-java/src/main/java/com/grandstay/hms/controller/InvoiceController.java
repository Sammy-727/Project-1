package com.grandstay.hms.controller;

import com.grandstay.hms.model.Booking;
import com.grandstay.hms.repository.BookingRepository;
import com.grandstay.hms.repository.PaymentRepository;
import com.grandstay.hms.repository.RoomServiceRequestRepository;
import com.grandstay.hms.service.HmsService;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@Controller
public class InvoiceController {

    private final BookingRepository bookingRepository;
    private final PaymentRepository paymentRepository;
    private final RoomServiceRequestRepository roomServiceRequestRepository;
    private final HmsService hmsService;

    public InvoiceController(BookingRepository bookingRepository, PaymentRepository paymentRepository,
                             RoomServiceRequestRepository roomServiceRequestRepository, HmsService hmsService) {
        this.bookingRepository = bookingRepository;
        this.paymentRepository = paymentRepository;
        this.roomServiceRequestRepository = roomServiceRequestRepository;
        this.hmsService = hmsService;
    }

    @GetMapping("/invoice/{id}")
    public String invoice(@PathVariable Long id, Model model) {
        Booking booking = bookingRepository.findById(id).orElseThrow();
        double roomCharges = hmsService.calcRoomCharges(booking.getRoom().getPrice(), booking.getCheckin(), booking.getCheckout());
        double serviceCharges = hmsService.serviceCharges(id);
        double subtotal = roomCharges + serviceCharges;
        double tax = subtotal * 0.12;
        double total = subtotal + tax;

        model.addAttribute("title", "Invoice");
        model.addAttribute("booking", booking);
        model.addAttribute("roomCharges", roomCharges);
        model.addAttribute("serviceCharges", serviceCharges);
        model.addAttribute("tax", tax);
        model.addAttribute("total", total);
        model.addAttribute("discount", 0.0);
        model.addAttribute("rsCharges", roomServiceRequestRepository.findByBookingIdAndAddToBillTrueAndStatusNot(id, "Cancelled"));
        model.addAttribute("payments", paymentRepository.findByBookingIdOrderByIdAsc(id));
        return "invoice";
    }
}
