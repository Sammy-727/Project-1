package com.grandstay.hms.controller;

import com.grandstay.hms.model.Customer;
import com.grandstay.hms.repository.GuestRepository;
import com.grandstay.hms.service.HmsService;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Controller
@RequestMapping("/customers")
public class CustomerController {

    private final HmsService hmsService;
    private final GuestRepository guestRepository;

    public CustomerController(HmsService hmsService, GuestRepository guestRepository) {
        this.hmsService = hmsService;
        this.guestRepository = guestRepository;
    }

    @GetMapping
    public String list(@RequestParam(required = false) String q, Model model) {
        model.addAttribute("title", "Customers");
        List<Customer> customers = hmsService.searchCustomers(q);
        Map<Long, Long> bookingCounts = new HashMap<>();
        Map<Long, List<?>> guestMap = new HashMap<>();
        for (Customer c : customers) {
            bookingCounts.put(c.getId(), hmsService.bookingCount(c.getId()));
            guestMap.put(c.getId(), guestRepository.findByCustomerIdAndBookingIsNull(c.getId()));
        }
        model.addAttribute("customers", customers);
        model.addAttribute("bookingCounts", bookingCounts);
        model.addAttribute("guestMap", guestMap);
        model.addAttribute("searchQ", q);
        return "customers";
    }

    @PostMapping("/add")
    public String add(@ModelAttribute Customer customer,
                      @RequestParam(required = false) List<String> guestName,
                      @RequestParam(required = false) String redirectTo,
                      RedirectAttributes ra) {
        Customer saved = hmsService.saveCustomer(customer, guestName);
        ra.addFlashAttribute("success", "Customer added.");
        if ("bookings".equals(redirectTo)) return "redirect:/bookings?newCustomer=" + saved.getId();
        return "redirect:/customers";
    }

    @PostMapping("/update/{id}")
    public String update(@PathVariable Long id, @ModelAttribute Customer customer,
                         @RequestParam(required = false) List<String> guestName, RedirectAttributes ra) {
        customer.setId(id);
        hmsService.saveCustomer(customer, guestName);
        ra.addFlashAttribute("success", "Customer updated.");
        return "redirect:/customers";
    }

    @PostMapping("/delete/{id}")
    public String delete(@PathVariable Long id, RedirectAttributes ra) {
        try {
            hmsService.deleteCustomer(id);
            ra.addFlashAttribute("success", "Customer deleted.");
        } catch (Exception e) {
            ra.addFlashAttribute("error", e.getMessage());
        }
        return "redirect:/customers";
    }
}
