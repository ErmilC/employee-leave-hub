package com.leavehub.repository;

import com.leavehub.entity.DemoEmail;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DemoEmailRepository extends JpaRepository<DemoEmail, String> {
    List<DemoEmail> findAllByOrderBySentAtDesc();
    List<DemoEmail> findByRecipientEmailIgnoreCaseOrderBySentAtDesc(String recipientEmail);
}
