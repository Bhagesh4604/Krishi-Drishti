"""
VM0042 Carbon Credit Calculation Engine
Based on Verra VM0042 Improved Agricultural Land Management methodology.

Formula:
  SOC_stock (t C/ha) = (SOC% / 100) × Bulk_Density (g/cm³) × Depth (m) × 10
  Net_change (t C/ha) = SOC_monitoring - SOC_baseline
  Total_C_sequestered (t C) = Net_change × Plot_area (ha)
  CO2_equivalent (t CO2e) = Total_C_sequestered × (44/12)
  Buffer_deduction (t CO2e) = CO2_equivalent × buffer_pool_pct / 100
  Issuable_credits (t CO2e) = CO2_equivalent - Buffer_deduction
"""

from typing import Optional, Dict, Any
from ..models import CarbonProject, SoilSampleRecord
from sqlalchemy.orm import Session


def calculate_soc_stock(soc_pct: float, bulk_density: float, depth_cm: int) -> float:
    """
    Convert SOC% + bulk density + depth to t C/ha.
    IPCC Tier 2 standard formula.
    """
    depth_m = depth_cm / 100.0
    # tC/ha = (SOC% / 100) × BD (g/cm³) × depth (m) × 10
    return round((soc_pct / 100.0) * bulk_density * depth_m * 10.0, 4)


def get_authoritative_soc(sample: SoilSampleRecord) -> Optional[float]:
    """Return admin-verified SOC% if available, else farmer-entered."""
    return sample.admin_soc_percent if sample.admin_soc_percent else sample.soc_percent


def get_authoritative_bd(sample: SoilSampleRecord) -> Optional[float]:
    """Return admin-verified bulk density if available, else farmer-entered."""
    return sample.admin_bulk_density if sample.admin_bulk_density else sample.bulk_density_g_cm3


def calculate_vm0042_credits(
    project: CarbonProject,
    db: Session,
) -> Dict[str, Any]:
    """
    Calculate issuable carbon credits using the VM0042 methodology.

    Requirements:
    - At least one admin-verified Baseline soil sample with SOC% + Bulk Density
    - At least one admin-verified M&R (Monitoring & Re-measurement) soil sample
    - Plot area in acres (converted to hectares)

    Returns a detailed breakdown dict with all intermediate values.
    """
    result = {
        "eligible": False,
        "reason": None,
        "baseline_soc_stock_t_ha": None,
        "monitoring_soc_stock_t_ha": None,
        "net_soc_change_t_c_ha": None,
        "plot_area_ha": None,
        "total_c_sequestered_t": None,
        "co2_equivalent_t": None,
        "buffer_pool_pct": project.buffer_pool_percentage,
        "buffer_deduction_t": None,
        "issuable_credits_t_co2e": None,
        "methodology": "Verra VM0042 IALM",
        "depth_cm": None,
        "baseline_sample_id": None,
        "monitoring_sample_id": None,
    }

    # 1. Get all verified soil samples
    samples = (
        db.query(SoilSampleRecord)
        .filter(
            SoilSampleRecord.project_id == project.id,
            SoilSampleRecord.verified_by_admin == True,
        )
        .all()
    )

    if not samples:
        result["reason"] = "No admin-verified soil samples. Admin must verify lab report and enter SOC values."
        return result

    # 2. Find best Baseline sample (must have SOC% + BD)
    baseline_samples = [
        s for s in samples
        if s.sample_type == "Baseline"
        and get_authoritative_soc(s) is not None
        and get_authoritative_bd(s) is not None
    ]
    if not baseline_samples:
        result["reason"] = "No verified Baseline sample with SOC% and Bulk Density. Admin must verify the baseline lab report."
        return result

    # Use the most recent verified baseline
    baseline = sorted(baseline_samples, key=lambda s: s.sample_date)[-1]
    baseline_soc = get_authoritative_soc(baseline)
    baseline_bd = get_authoritative_bd(baseline)
    baseline_stock = calculate_soc_stock(baseline_soc, baseline_bd, baseline.depth_cm)

    # 3. Find best M&R (Monitoring & Remeasurement) sample
    mr_samples = [
        s for s in samples
        if s.sample_type == "M&R"
        and get_authoritative_soc(s) is not None
        and get_authoritative_bd(s) is not None
    ]
    if not mr_samples:
        result["reason"] = (
            "No verified M&R (Monitoring & Re-measurement) sample found. "
            "A follow-up soil test is required after at least one crop season to measure SOC change."
        )
        result["baseline_soc_stock_t_ha"] = baseline_stock
        result["baseline_sample_id"] = baseline.id
        return result

    # Use the most recent verified M&R sample
    monitoring = sorted(mr_samples, key=lambda s: s.sample_date)[-1]
    monitoring_soc = get_authoritative_soc(monitoring)
    monitoring_bd = get_authoritative_bd(monitoring)
    monitoring_stock = calculate_soc_stock(monitoring_soc, monitoring_bd, monitoring.depth_cm)

    # 4. Compute net change
    net_change = round(monitoring_stock - baseline_stock, 4)
    if net_change <= 0:
        result["reason"] = (
            f"No net SOC increase detected. Baseline: {baseline_stock:.3f} t C/ha, "
            f"Monitoring: {monitoring_stock:.3f} t C/ha. "
            "Carbon credits can only be issued for positive net sequestration."
        )
        result["baseline_soc_stock_t_ha"] = baseline_stock
        result["monitoring_soc_stock_t_ha"] = monitoring_stock
        result["net_soc_change_t_c_ha"] = net_change
        return result

    # 5. Convert plot area from acres to hectares (1 acre = 0.404686 ha)
    plot = project.plot
    area_acres = plot.area or 0.0
    area_ha = round(area_acres * 0.404686, 4)
    if area_ha <= 0:
        result["reason"] = "Plot area is 0. Please define the farm boundary first."
        return result

    # 6. Total carbon sequestered
    total_c = round(net_change * area_ha, 4)

    # 7. Convert C → CO2 equivalent (molecular weight ratio 44/12)
    co2_eq = round(total_c * (44.0 / 12.0), 4)

    # 8. Apply buffer pool deduction
    buffer_pct = project.buffer_pool_percentage or 15.0
    buffer_deduction = round(co2_eq * buffer_pct / 100.0, 4)
    issuable = round(co2_eq - buffer_deduction, 4)

    result.update({
        "eligible": True,
        "reason": "Calculation successful. Ready for VVB verification.",
        "baseline_soc_stock_t_ha": baseline_stock,
        "monitoring_soc_stock_t_ha": monitoring_stock,
        "net_soc_change_t_c_ha": net_change,
        "plot_area_ha": area_ha,
        "total_c_sequestered_t": total_c,
        "co2_equivalent_t": co2_eq,
        "buffer_deduction_t": buffer_deduction,
        "issuable_credits_t_co2e": issuable,
        "depth_cm": baseline.depth_cm,
        "baseline_sample_id": baseline.id,
        "monitoring_sample_id": monitoring.id,
    })
    return result
