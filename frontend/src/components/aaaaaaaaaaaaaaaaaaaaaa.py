from scipy.integrate import quad
from scipy.stats import norm
import numpy as np
import matplotlib.pyplot as plt
import pandas as pd
x = 67         
x_bar = 66.28  
sigma = 15.24 
z_rounded = 0.05  
print(f"Given values:")
print(f"x = {x}")
print(f"x̄ = {x_bar}")
print(f"σ = {sigma}")
print(f"\nRounded z-score: {z_rounded}")

percentile_rounded = norm.cdf(z_rounded)
print(f"\nPercentile (area to the left of z = {z_rounded}):")
print(f"P(X < {x}) = {percentile_rounded:.4f}")

area_below_mean = 0.5000
area_between_mean_and_score = 0.1293 
print(f"\nArea between mean and score:")
print(f"Area between mean ({x_bar}) and score ({x}): {area_between_mean_and_score:.4f}")

students_below_score = area_below_mean + area_between_mean_and_score
print(f"\nStudents who scored less than {x}:")
print(f"Left of mean + area between = 0.5000 + {area_between_mean_and_score:.4f} = {students_below_score:.4f} ({students_below_score*100:.2f}%)")

AAcalculation = 0.5000 + 0.1293
print(f"\nYour calculation: 0.5000 + 0.1293 = {AAcalculation:.4f} ({AAcalculation*100:.2f}%)")
print(f"Difference from calculation: {abs(students_below_score - AAcalculation):.4f}")

total_students = 50
students_below_average = int(percentile_rounded * total_students)
print(f"\nIf total students = {total_students}:")
print(f"Students who scored below {x}: {students_below_average}")


x_range = np.linspace(x_bar - 4*sigma, x_bar + 4*sigma, num=1000)
pdf_normal = norm.pdf(x_range, x_bar, sigma)

fig, ax = plt.subplots(figsize=(12, 6))
ax.plot(x_range, pdf_normal, 'k-', linewidth=2)
ax.axvline(x_bar, color='k', linestyle='--', label=f'Mean (x̄ = {x_bar})')
ax.axvline(x, color='k', linestyle='-', linewidth=2, label=f'Average Score (x = {x})')

# Fill area to the left of the score
x_fill_left = np.linspace(x_bar - 4*sigma, x, 100)
y_fill_left = norm.pdf(x_fill_left, x_bar, sigma)
ax.fill_between(x_fill_left, y_fill_left, alpha=1.0, color='black', label=f'0.6293 (Students who got below the score)')

ax.set_xlabel('Score', size=12)
ax.set_ylabel('Probability Density', size=12)
ax.set_title(f'Normal Distribution: μ={x_bar}, σ={sigma}', size=14)
ax.legend()
plt.tight_layout()
plt.show()

# Function to calculate percentile for any score
def normalProbabilityDensity(x_val):
    constant = 1.0 / np.sqrt(2*np.pi)
    return constant * np.exp((-x_val**2) / 2.0)

# Alternative calculation using integration
percentile_integration, _ = quad(normalProbabilityDensity, np.NINF, z_rounded)
print(f"\nVerification using integration:")
print(f"Percentile from integration: {percentile_integration:.4f}")
print(f"Difference from scipy.stats: {abs(percentile_rounded - percentile_integration):.6f}")