package com.grandstay.hms.controller;

import com.grandstay.hms.model.InventoryItem;
import com.grandstay.hms.repository.InventoryRepository;
import com.grandstay.hms.service.HmsService;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Controller
@RequestMapping("/inventory")
public class InventoryController {

    private final InventoryRepository inventoryRepository;
    private final HmsService hmsService;

    public InventoryController(InventoryRepository inventoryRepository, HmsService hmsService) {
        this.inventoryRepository = inventoryRepository;
        this.hmsService = hmsService;
    }

    @GetMapping
    public String list(@RequestParam(required = false) String q,
                       @RequestParam(required = false) boolean low, Model model) {
        model.addAttribute("title", "Inventory");
        if (low) model.addAttribute("items", inventoryRepository.findLowStock());
        else if (q != null && !q.isBlank())
            model.addAttribute("items", inventoryRepository
                    .findByItemNameContainingIgnoreCaseOrCategoryContainingIgnoreCaseOrSupplierNameContainingIgnoreCase(q, q, q));
        else
            model.addAttribute("items", inventoryRepository.findAll());
        model.addAttribute("lowOnly", low);
        return "inventory";
    }

    @PostMapping("/add")
    public String add(@ModelAttribute InventoryItem item, RedirectAttributes ra) {
        hmsService.saveInventory(item);
        ra.addFlashAttribute("success", "Item added.");
        return "redirect:/inventory";
    }

    @PostMapping("/update/{id}")
    public String update(@PathVariable Long id, @ModelAttribute InventoryItem item, RedirectAttributes ra) {
        item.setId(id);
        hmsService.saveInventory(item);
        ra.addFlashAttribute("success", "Item updated.");
        return "redirect:/inventory";
    }

    @PostMapping("/delete/{id}")
    public String delete(@PathVariable Long id, RedirectAttributes ra) {
        inventoryRepository.deleteById(id);
        ra.addFlashAttribute("success", "Item deleted.");
        return "redirect:/inventory";
    }

    @PostMapping("/restock/{id}")
    public String restock(@PathVariable Long id, @RequestParam int quantity, RedirectAttributes ra) {
        hmsService.restockInventory(id, quantity);
        ra.addFlashAttribute("success", "Stock updated.");
        return "redirect:/inventory";
    }
}
