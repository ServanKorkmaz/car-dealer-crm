// Test script for natural language contract parsing
const testCases = [
  // Test A: Exact example with real car
  {
    input: "Opprett en kontrakt med Servan Korkmaz, med telefonnummer 41383322, på bil PR52981",
    expected: {
      name: "Servan Korkmaz",
      phone: "41383322",
      registration: "PR52981"
    }
  },
  // Test B: Alternative format with real car
  {
    input: "Opprett kontrakt på bil PR52981 til Ola Normann, tlf 900 00 000",
    expected: {
      name: "Ola Normann",
      phone: "90000000",
      registration: "PR52981"
    }
  },
  // Test C: Unknown registration
  {
    input: "Opprett kontrakt på bil XX99999 til Test Person, tlf 12345678",
    expected: {
      name: "Test Person",
      phone: "12345678",
      registration: "XX99999",
      shouldFail: true
    }
  },
  // Test D: Missing phone
  {
    input: "Opprett kontrakt på bil PR52981 til Kari Nordmann",
    expected: {
      name: "Kari Nordmann",
      phone: null,
      registration: "PR52981",
      needsPhone: true
    }
  }
];

async function testContractParsing() {
  console.log("Testing natural language contract parsing...\n");
  
  for (const test of testCases) {
    console.log(`Test: "${test.input}"`);
    
    try {
      const response = await fetch('http://localhost:5000/api/assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'connect.sid=s%3AE8QXuSrO0NvFagb7o0m94CcNtG8Pv65V.uVgKPqxMtdGGlC5l52kdkN89ktlZOJWEJvvVWN6xoWs'
        },
        body: JSON.stringify({
          message: test.input,
          hints: {
            companyId: 'default-company',
            userId: 'test-user-123',
            currentRoute: '/contracts'
          }
        })
      });
      
      const result = await response.json();
      console.log("Response:", result.reply);
      
      if (result.tool) {
        console.log("Tool action:", result.tool);
      }
      
      if (result.context) {
        console.log("Context:", result.context);
      }
      
      console.log("Expected:", test.expected);
      console.log("---\n");
    } catch (error) {
      console.error("Error:", error.message);
      console.log("---\n");
    }
  }
}

testContractParsing();