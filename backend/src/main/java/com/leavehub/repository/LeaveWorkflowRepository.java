package com.leavehub.repository;

import com.leavehub.entity.LeaveWorkflow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface LeaveWorkflowRepository extends JpaRepository<LeaveWorkflow, Integer> {
    List<LeaveWorkflow> findByLeaveRequestIdOrderByChangedAtAsc(Integer leaveRequestId);
}
