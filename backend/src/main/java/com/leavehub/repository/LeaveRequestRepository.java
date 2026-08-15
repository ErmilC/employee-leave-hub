package com.leavehub.repository;

import com.leavehub.entity.LeaveRequest;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface LeaveRequestRepository extends JpaRepository<LeaveRequest, Integer> {
    List<LeaveRequest> findByEmplId(Integer emplId);

    List<LeaveRequest> findByEmplIdIn(List<Integer> emplIds);

    @Query("SELECT lr FROM LeaveRequest lr WHERE lr.emplId IN :emplIds AND lr.status IN ('APPROVED', 'PENDING') AND lr.startDate <= :endDate AND lr.endDate >= :startDate")
    List<LeaveRequest> findOverlappingRequests(@Param("emplIds") List<Integer> emplIds,
                                              @Param("startDate") LocalDate startDate,
                                              @Param("endDate") LocalDate endDate);

    @Query("SELECT lr FROM LeaveRequest lr WHERE lr.emplId = :emplId AND lr.status IN ('APPROVED', 'PENDING') AND lr.startDate <= :endDate AND lr.endDate >= :startDate")
    List<LeaveRequest> findEmployeeOverlappingRequests(@Param("emplId") Integer emplId,
                                                      @Param("startDate") LocalDate startDate,
                                                      @Param("endDate") LocalDate endDate);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT lr FROM LeaveRequest lr WHERE lr.leaveRequestId = :id")
    Optional<LeaveRequest> findByIdWithLock(@Param("id") Integer id);
}

