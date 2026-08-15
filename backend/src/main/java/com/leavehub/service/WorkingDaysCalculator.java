package com.leavehub.service;

import org.springframework.stereotype.Component;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.MonthDay;
import java.util.HashSet;
import java.util.Set;

@Component
public class WorkingDaysCalculator {

    // Fixed Romanian Public Holidays (Month-Day)
    private static final Set<MonthDay> FIXED_HOLIDAYS = Set.of(
            MonthDay.of(1, 1),   // Anul Nou
            MonthDay.of(1, 2),   // Anul Nou
            MonthDay.of(1, 6),   // Boboteaza
            MonthDay.of(1, 7),   // Sf. Ioan Botezatorul
            MonthDay.of(1, 24),  // Ziua Unirii Principatelor
            MonthDay.of(5, 1),   // Ziua Muncii
            MonthDay.of(6, 1),   // Ziua Copilului
            MonthDay.of(8, 15),  // Adormirea Maicii Domnului
            MonthDay.of(11, 30), // Sfantul Andrei
            MonthDay.of(12, 1),  // Ziua Nationala
            MonthDay.of(12, 25), // Craciun
            MonthDay.of(12, 26)  // Craciun
    );

    public int calculateWorkingDays(LocalDate startDate, LocalDate endDate) {
        if (startDate == null || endDate == null || startDate.isAfter(endDate)) {
            return 0;
        }

        int count = 0;
        LocalDate current = startDate;

        while (!current.isAfter(endDate)) {
            if (isWorkingDay(current)) {
                count++;
            }
            current = current.plusDays(1);
        }

        return count;
    }

    public boolean isWorkingDay(LocalDate date) {
        DayOfWeek dow = date.getDayOfWeek();
        if (dow == DayOfWeek.SATURDAY || dow == DayOfWeek.SUNDAY) {
            return false;
        }

        if (FIXED_HOLIDAYS.contains(MonthDay.from(date))) {
            return false;
        }

        Set<LocalDate> mobileHolidays = getOrthodoxEasterHolidays(date.getYear());
        return !mobileHolidays.contains(date);
    }

    /**
     * Calculates mobile Orthodox Easter holidays for a given Gregorian year:
     * - Vinerea Mare (Good Friday = Easter - 2 days)
     * - A doua zi de Pasti / Lunea Pastelui (Easter Monday = Easter + 1 day)
     * - A doua zi de Rusalii / Lunea Rusaliilor (Pentecost Monday = Easter + 50 days)
     */
    public Set<LocalDate> getOrthodoxEasterHolidays(int year) {
        Set<LocalDate> holidays = new HashSet<>();

        // Meeus / Jones / Butcher algorithm for Julian Easter converted to Gregorian
        int a = year % 4;
        int b = year % 7;
        int c = year % 19;
        int d = (19 * c + 15) % 30;
        int e = (2 * a + 4 * b - d + 34) % 7;
        int month = (d + e + 114) / 31;
        int day = ((d + e + 114) % 31) + 1;

        LocalDate julianEaster = LocalDate.of(year, month, day);
        // Gregorian offset for 1900-2099 is +13 days
        LocalDate orthodoxEaster = julianEaster.plusDays(13);

        holidays.add(orthodoxEaster.minusDays(2)); // Vinerea Mare
        holidays.add(orthodoxEaster);              // Paștele Ortodox (Prima zi)
        holidays.add(orthodoxEaster.plusDays(1));  // Lunea Paștelui (A doua zi de Paști)
        holidays.add(orthodoxEaster.plusDays(49)); // Rusaliile (Prima zi)
        holidays.add(orthodoxEaster.plusDays(50)); // Lunea Rusaliilor (A doua zi de Rusalii)

        return holidays;
    }
}
