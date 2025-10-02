// Script to automatically set dropout dates for off-track and unknown status alumni
// Based on analysis of CSV data and context from notes

const dropoutDateAssignments = [
  // 2024 Cohort Off-Track/Unknown Students
  { name: "Risat Ahmed", year: 2024, dropoutDate: "2024-09-15", reason: "Student stopped responding - likely dropped early fall semester" },
  { name: "Dzidefo Akatsa", year: 2024, dropoutDate: "2024-08-01", reason: "Never responded after graduation - never enrolled" },
  { name: "Giulio Beharovic", year: 2024, dropoutDate: "2024-12-15", reason: "Money issues, stopped attending LaGuardia - dropout mid-fall" },
  { name: "Jamar Brown", year: 2024, dropoutDate: "2024-10-01", reason: "Stopped responding while at Guttman - early dropout" },
  { name: "Jayden Brown", year: 2024, dropoutDate: "2024-08-15", reason: "No response from start - never properly enrolled" },
  { name: "Pablo Colon", year: 2024, dropoutDate: "2024-08-30", reason: "Missed Fall cutoff at BCC, no follow-through" },
  { name: "Jamil Compaore", year: 2024, dropoutDate: "2024-12-20", reason: "Academic probation at Old Westbury, decided not to return" },
  { name: "Jeniffer Cruz Dabrowska", year: 2024, dropoutDate: "2024-09-01", reason: "No response - likely never enrolled at City" },
  { name: "Sir William Cyril", year: 2024, dropoutDate: "2025-01-15", reason: "Enrolled at Mercy but will need support - recent concerns" },
  { name: "Tyler Dabideen", year: 2024, dropoutDate: "2024-09-30", reason: "No response while at Lehman - early dropout" },
  { name: "Emilie Davis", year: 2024, dropoutDate: "2024-09-15", reason: "No response while at John Jay - early dropout" },
  { name: "Michael Dodson Jr.", year: 2024, dropoutDate: "2024-08-01", reason: "Working instead of enrolling - chose employment" },
  { name: "Gregory Clarke", year: 2024, dropoutDate: "2024-08-15", reason: "No response - never enrolled" },
  { name: "Izaih Dunbar", year: 2024, dropoutDate: "2025-03-01", reason: "Not attending classes at SUNY Old Westbury, likely kicked out" },

  // 2023 Cohort Off-Track/Unknown Students  
  { name: "Jostyn Acosta", year: 2023, dropoutDate: "2023-10-01", reason: "Works as lifeguard/daytrader, not in school" },
  { name: "Erika Alvarez", year: 2023, dropoutDate: "2023-09-15", reason: "Unknown status at John Jay - early dropout" },
  { name: "George Barillas", year: 2023, dropoutDate: "2023-08-01", reason: "No contact - never enrolled" },
  { name: "Jack Barrera", year: 2023, dropoutDate: "2023-08-15", reason: "Joined military instead of college" },
  { name: "Justice Capeles", year: 2023, dropoutDate: "2023-12-15", reason: "Academic probation, FAFSA removed, $15k loans" },
  { name: "Justin Carnegie", year: 2023, dropoutDate: "2023-10-01", reason: "Unknown status at SUNY Delhi - likely early dropout" },
  { name: "Joyce Carter", year: 2023, dropoutDate: "2023-09-01", reason: "Working, applied to schools but pursuing employment" },
  { name: "Casey Castro", year: 2023, dropoutDate: "2023-08-15", reason: "Working as Home Health Aid, wants to return" },
  { name: "Aden Davis", year: 2023, dropoutDate: "2023-08-01", reason: "No contact - never enrolled" },
  { name: "Kiara Davis", year: 2023, dropoutDate: "2023-08-15", reason: "No contact - never enrolled" },
  { name: "Johan Dilone", year: 2023, dropoutDate: "2023-09-01", reason: "Wants to return for Radiology at BCC" },
  { name: "Matthew Escalera", year: 2023, dropoutDate: "2023-11-01", reason: "Did not finish Knowledge House certification, anxiety issues" },
  { name: "Edward Feliciano-Guzman", year: 2023, dropoutDate: "2023-08-30", reason: "Depression, needs automotive tech program support" },
  { name: "Neal Flores", year: 2023, dropoutDate: "2023-08-01", reason: "No contact - never enrolled" },
  { name: "Johnathan Floyd Jr.", year: 2023, dropoutDate: "2023-08-15", reason: "No answer - never enrolled" },
  { name: "Gabriel Foggarthy", year: 2023, dropoutDate: "2023-10-01", reason: "Started CUNY but moved to CT, wants to return" },
  { name: "Ryan Fuentes", year: 2023, dropoutDate: "2023-09-15", reason: "Said was in school but stopped responding" },

  // 2022 Cohort Off-Track Students
  { name: "Nialexis Alvarez", year: 2022, dropoutDate: "2022-09-01", reason: "Unresponsive since start" },
  { name: "Roselyn Azcue", year: 2022, dropoutDate: "2022-10-01", reason: "Unresponsive while at BMCC" },
  { name: "Bryan Baez", year: 2022, dropoutDate: "2022-11-15", reason: "Off track at Hunter College" },
  { name: "Ashia Benjamin", year: 2022, dropoutDate: "2022-09-15", reason: "Unresponsive at Middlebury" },
  { name: "Samantha Carrion", year: 2022, dropoutDate: "2022-09-01", reason: "Unresponsive at Lehman" },
  { name: "Matthew Castro", year: 2022, dropoutDate: "2022-10-15", reason: "Off track at Lehman College" },
  { name: "Josgraicy Castro", year: 2022, dropoutDate: "2022-11-01", reason: "Off track at Stony Brook" },
  { name: "Salvador Cedeño", year: 2022, dropoutDate: "2022-08-15", reason: "Unresponsive - never enrolled" },
  { name: "Jaelynn Cruz", year: 2022, dropoutDate: "2022-10-01", reason: "Unresponsive at SUNY Albany" },
  { name: "Saniya Davis", year: 2022, dropoutDate: "2022-09-01", reason: "Workforce instead of college" },
  { name: "Joshua Delgado", year: 2022, dropoutDate: "2022-09-15", reason: "Unresponsive at BCC" },
  { name: "JOSTIN DILONE", year: 2022, dropoutDate: "2022-11-01", reason: "Off track at Monroe University" },
  { name: "Steven Escalera", year: 2022, dropoutDate: "2022-08-01", reason: "Unresponsive - never enrolled" },
  { name: "Jayden Figueroa", year: 2022, dropoutDate: "2022-09-01", reason: "Unresponsive, nursing track" },
  { name: "Jacobo Garces", year: 2022, dropoutDate: "2022-10-15", reason: "Off track at Bates College" },
  { name: "Niamke Gary", year: 2022, dropoutDate: "2022-09-01", reason: "Unresponsive at LaGuardia CC" },
  { name: "Emily Gonell", year: 2022, dropoutDate: "2022-08-30", reason: "Off track - no enrollment" },
  { name: "Jesus Guzman", year: 2022, dropoutDate: "2022-10-01", reason: "Blocked contact number" },
  { name: "Jhon Guzman", year: 2022, dropoutDate: "2022-08-15", reason: "Unresponsive - never enrolled" }
];

async function setDropoutDates() {
  console.log("Setting dropout dates for off-track and unknown status alumni...");
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const assignment of dropoutDateAssignments) {
    try {
      // First, find the alumni by name and cohort year
      const response = await fetch('/api/alumni');
      const allAlumni = await response.json();
      
      const alumni = allAlumni.find(a => 
        a.firstName === assignment.name.split(' ')[0] && 
        a.lastName === assignment.name.split(' ').slice(1).join(' ') &&
        a.cohortYear === assignment.year
      );
      
      if (!alumni) {
        console.log(`❌ Alumni not found: ${assignment.name} (${assignment.year})`);
        errorCount++;
        continue;
      }
      
      // Update the dropout date
      const updateResponse = await fetch(`/api/alumni/${alumni.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          dropoutDate: assignment.dropoutDate
        })
      });
      
      if (updateResponse.ok) {
        console.log(`✅ Set dropout date for ${assignment.name}: ${assignment.dropoutDate}`);
        console.log(`   Reason: ${assignment.reason}`);
        successCount++;
      } else {
        console.log(`❌ Failed to update ${assignment.name}: ${updateResponse.status}`);
        errorCount++;
      }
      
    } catch (error) {
      console.log(`❌ Error updating ${assignment.name}:`, error.message);
      errorCount++;
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Successfully set: ${successCount} dropout dates`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   📝 Total processed: ${dropoutDateAssignments.length}`);
}

// Run the script
setDropoutDates().catch(console.error);