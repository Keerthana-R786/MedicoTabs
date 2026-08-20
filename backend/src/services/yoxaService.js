import axios from 'axios';
import { yoxaConfig } from '../config/yoxa.js';

/**
 * Trigger YOXA workflow with referral data
 * This is called when a referral is created in the EHR system
 * 
 * @param {Object} referralData - The referral information
 * @returns {Promise<Object>} - YOXA response with workflow_run_id
 */
export async function triggerWorkflow(referralData) {
  if (!yoxaConfig.triggerUrl || !yoxaConfig.deploymentSecret) {
    throw new Error('YOXA configuration incomplete. Cannot trigger workflow.');
  }
  
  try {
    console.log('🚀 Triggering YOXA workflow for referral:', referralData.referralNumber);
    
    // Construct the payload for YOXA trigger
    // This must match what the YOXA workflow expects as entry trigger input
    const payload = {
      // Entry trigger fields based on workflow context
      patient_context: {
        patient_id: referralData.patientId,
        patient_name: referralData.patientName,
        date_of_birth: referralData.patientDOB,
        insurance_provider: referralData.insuranceProvider,
        member_id: referralData.memberId,
      },
      referral_details: {
        referral_id: referralData.referralNumber,
        referral_reason: referralData.referralReason,
        requested_specialty: referralData.requestedSpecialty,
        specialist_preference: referralData.specialistPreference || null,
        service_type: referralData.serviceType || null,
        urgency: referralData.urgency, // Routine, Urgent, or Emergency
      },
      primary_doctor: {
        doctor_id: referralData.primaryDoctorId,
        doctor_name: referralData.primaryDoctorName,
        organization: referralData.primaryOrganization,
      },
      // Optional: Include document references if already uploaded
      documents: referralData.documentIds || [],
      // Metadata for tracking
      metadata: {
        ehr_system: 'MedicoTabs',
        created_at: new Date().toISOString(),
      },
    };
    
    // Make the trigger request to YOXA
    const response = await axios.post(
      yoxaConfig.triggerUrl,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${yoxaConfig.deploymentSecret}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000, // 10 second timeout
      }
    );
    
    // YOXA returns workflow_run_id on successful trigger
    const workflowRunId = response.data.workflow_run_id || response.data.workflowRunId;
    
    if (!workflowRunId) {
      console.error('YOXA response missing workflow_run_id:', response.data);
      throw new Error('YOXA trigger succeeded but did not return workflow_run_id');
    }
    
    console.log('✓ YOXA workflow triggered successfully');
    console.log('  Workflow Run ID:', workflowRunId);
    
    return {
      success: true,
      workflowRunId,
      response: response.data,
    };
    
  } catch (error) {
    console.error('✗ Failed to trigger YOXA workflow:', error.message);
    
    if (error.response) {
      console.error('  Status:', error.response.status);
      console.error('  Response:', error.response.data);
    }
    
    throw new Error(`YOXA workflow trigger failed: ${error.message}`);
  }
}

/**
 * Send HITL approval response back to YOXA
 * Called when a doctor responds to an approval request
 * 
 * @param {string} requestId - YOXA HITL request ID
 * @param {string} selectedOptionId - The option selected (optional)
 * @param {string} overrideMessage - Custom message (optional)
 * @returns {Promise<Object>} - YOXA response
 */
export async function respondToApproval(requestId, selectedOptionId = null, overrideMessage = null) {
  if (!yoxaConfig.apiBase || !yoxaConfig.deploymentId || !yoxaConfig.hitl.responseSecret) {
    throw new Error('YOXA HITL configuration incomplete. Cannot send response.');
  }
  
  // Must provide either selectedOptionId OR overrideMessage, not both
  if (!selectedOptionId && !overrideMessage) {
    throw new Error('Must provide either selectedOptionId or overrideMessage');
  }
  
  if (selectedOptionId && overrideMessage) {
    throw new Error('Cannot provide both selectedOptionId and overrideMessage. Choose one.');
  }
  
  try {
    console.log('📤 Sending HITL response to YOXA');
    console.log('  Request ID:', requestId);
    console.log('  Selected Option:', selectedOptionId || 'N/A');
    console.log('  Override Message:', overrideMessage ? 'Provided' : 'N/A');
    
    const responseUrl = `${yoxaConfig.apiBase}/api/v1/public/workflow-deployments/${yoxaConfig.deploymentId}/hitl/requests/${requestId}/respond`;
    
    // Construct payload - exactly one of these fields
    const payload = selectedOptionId 
      ? { selected_option_id: selectedOptionId }
      : { override_message: overrideMessage };
    
    const response = await axios.post(
      responseUrl,
      payload,
      {
        headers: {
          'X-Yoxa-HITL-Response-Secret': yoxaConfig.hitl.responseSecret,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );
    
    // 202 = response accepted and workflow will resume
    // 200 = request was already answered (idempotent behavior)
    if (response.status === 202) {
      console.log('✓ HITL response accepted. Workflow will resume.');
    } else if (response.status === 200) {
      console.log('✓ HITL request was already answered (idempotent).');
    }
    
    return {
      success: true,
      status: response.status,
      alreadyAnswered: response.status === 200,
      response: response.data,
    };
    
  } catch (error) {
    console.error('✗ Failed to send HITL response:', error.message);
    
    if (error.response) {
      console.error('  Status:', error.response.status);
      console.error('  Response:', error.response.data);
    }
    
    throw new Error(`HITL response failed: ${error.message}`);
  }
}

/**
 * Get YOXA workflow run status (optional monitoring endpoint)
 * 
 * @param {string} workflowRunId - The workflow run ID to check
 * @returns {Promise<Object>} - Workflow status
 */
export async function getWorkflowStatus(workflowRunId) {
  if (!yoxaConfig.apiBase) {
    throw new Error('YOXA_API_BASE not configured');
  }
  
  try {
    // Note: This endpoint may require additional authentication
    // Adjust based on actual YOXA API documentation
    const response = await axios.get(
      `${yoxaConfig.apiBase}/api/v1/workflow-runs/${workflowRunId}`,
      {
        headers: {
          'Authorization': `Bearer ${yoxaConfig.deploymentSecret}`,
        },
        timeout: 5000,
      }
    );
    
    return response.data;
    
  } catch (error) {
    console.error('Failed to get workflow status:', error.message);
    throw error;
  }
}

export default {
  triggerWorkflow,
  respondToApproval,
  getWorkflowStatus,
};
