package com.grandstay.hms.repository;

import com.grandstay.hms.model.InventoryItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface InventoryRepository extends JpaRepository<InventoryItem, Long> {

    @Query("SELECT i FROM InventoryItem i WHERE i.quantity <= i.reorderLevel ORDER BY i.quantity ASC")
    List<InventoryItem> findLowStock();

    List<InventoryItem> findByItemNameContainingIgnoreCaseOrCategoryContainingIgnoreCaseOrSupplierNameContainingIgnoreCase(
            String name, String category, String supplier);
}
